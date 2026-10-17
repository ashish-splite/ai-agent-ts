import type { ChatMessage, ChatSession } from "./chat.ts";

export interface ChatRepository {
  createSession(session: ChatSession): Promise<ChatSession>;
  findSession(id: string): Promise<ChatSession | null>;
  listSessions(): Promise<ChatSession[]>;
  saveSession(session: ChatSession): Promise<ChatSession>;
  deleteSession(id: string): Promise<boolean>;
  appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void>;
  /** Returns the most recent `limit` messages in chronological order. */
  findMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
}
