import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import type { AppConfig } from "../config/app-config.ts";
import type { LlmClient, LlmMessage } from "../ports/llm-client.ts";
import { SYSTEM_PROMPT } from "./prompts.ts";
import type { AgentToolRegistry } from "./tools.ts";

/** Caps the tool-call loop so a looping model cannot hang the request. */
const MAX_TOOL_ROUNDS = 5;
const FALLBACK_REPLY = "Sorry, I could not generate a response.";

export class OpenAiAgent implements LlmClient {
  private readonly client: OpenAI;

  constructor(
    private readonly config: AppConfig,
    private readonly tools: AgentToolRegistry,
  ) {
    this.client = new OpenAI({ apiKey: this.config.openaiApiKey });
  }

  async complete(messages: LlmMessage[]): Promise<string> {
    const tools = this.tools.definitions();
    const conversation: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await this.client.chat.completions.create({
        model: this.config.llmModel,
        max_tokens: this.config.maxTokens,
        messages: conversation,
        ...(tools.length > 0 ? { tools } : {}),
      });

      const choice = response.choices[0]?.message;
      if (!choice) return FALLBACK_REPLY;

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return choice.content?.trim() || FALLBACK_REPLY;
      }

      // The assistant turn must precede its tool results in the transcript.
      conversation.push(choice);
      for (const call of toolCalls) {
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: await this.runTool(call),
        });
      }
    }

    return FALLBACK_REPLY;
  }

  private async runTool(call: ChatCompletionMessageToolCall): Promise<string> {
    if (call.type !== "function") {
      return `Error: unsupported tool call type "${call.type}".`;
    }

    const { name, arguments: rawArgs } = call.function;
    const handler = this.tools.find(name);
    if (!handler) return `Error: unknown tool "${name}".`;

    let args: Record<string, unknown>;
    try {
      args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
    } catch {
      return `Error: arguments for "${name}" were not valid JSON.`;
    }

    // Failures are fed back to the model so it can recover or explain.
    try {
      return await handler(args);
    } catch (error) {
      console.error(`[agent] tool "${name}" failed`, error);
      return `Error: tool "${name}" failed to execute.`;
    }
  }
}
