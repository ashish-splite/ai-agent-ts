import type { ChatRole } from "../domain/chat.ts";

export interface LlmMessage {
  role: ChatRole;
  content: string;
}

export interface LlmClient {
  complete(messages: LlmMessage[]): Promise<string>;
}
