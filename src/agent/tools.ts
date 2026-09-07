import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

export interface AgentTool {
  definition: ChatCompletionFunctionTool;
  handler: ToolHandler;
}

/** Tools are injected so handlers can depend on application services. */
export class AgentToolRegistry {
  constructor(private readonly tools: AgentTool[] = []) {}

  definitions(): ChatCompletionFunctionTool[] {
    return this.tools.map((tool) => tool.definition);
  }

  find(name: string): ToolHandler | undefined {
    return this.tools.find((tool) => tool.definition.function.name === name)
      ?.handler;
  }
}
