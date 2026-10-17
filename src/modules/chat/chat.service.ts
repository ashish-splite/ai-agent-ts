import { DEFAULT_SESSION_TITLE } from "./prompts.ts";
import type {
  ChatMessage,
  ChatSession,
  SendMessageResult,
} from "./chat.ts";
import { NotFoundError, ValidationError } from "../../shared/errors.ts";
import type { ChatRepository } from "./chat.repository.ts";
import type { LlmClient } from "./llm-client.ts";

const MAX_MESSAGE_LENGTH = 8000;
const HISTORY_WINDOW = 20;

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly llm: LlmClient,
  ) {}

  async startSession(): Promise<ChatSession> {
    const now = new Date().toISOString();
    return this.repository.createSession({
      id: crypto.randomUUID(),
      title: DEFAULT_SESSION_TITLE,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    });
  }

  async sendMessage(
    sessionId: string,
    message: string,
  ): Promise<SendMessageResult> {
    const content = this.requireMessage(message);
    const session = await this.getSession(sessionId);

    const history = await this.repository.findMessages(
      sessionId,
      HISTORY_WINDOW,
    );

    const userMessage = this.buildMessage("user", content);
    const answer = await this.llm.complete([
      ...history.map(({ role, content }) => ({ role, content })),
      { role: "user", content },
    ]);
    const reply = this.buildMessage("assistant", answer);

    await this.repository.appendMessages(sessionId, [userMessage, reply]);

    const updated = await this.repository.saveSession({
      ...session,
      title:
        session.messageCount === 0 ? this.deriveTitle(content) : session.title,
      updatedAt: reply.createdAt,
      messageCount: session.messageCount + 2,
    });

    return { session: updated, reply };
  }

  async listSessions(): Promise<ChatSession[]> {
    return this.repository.listSessions();
  }

  async getSession(id: string): Promise<ChatSession> {
    const session = await this.repository.findSession(id);
    if (!session) throw new NotFoundError(`Session ${id} not found`);
    return session;
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    await this.getSession(sessionId);
    return this.repository.findMessages(sessionId);
  }

  async deleteSession(id: string): Promise<void> {
    const deleted = await this.repository.deleteSession(id);
    if (!deleted) throw new NotFoundError(`Session ${id} not found`);
  }

  private buildMessage(
    role: ChatMessage["role"],
    content: string,
  ): ChatMessage {
    return {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };
  }

  private requireMessage(value: unknown): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError("message must be a non-empty string");
    }
    const trimmed = value.trim();
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError(
        `message must be at most ${MAX_MESSAGE_LENGTH} characters`,
      );
    }
    return trimmed;
  }

  private deriveTitle(firstMessage: string): string {
    const title = firstMessage.replace(/\s+/g, " ").slice(0, 60);
    return firstMessage.length > 60 ? `${title}...` : title;
  }
}
