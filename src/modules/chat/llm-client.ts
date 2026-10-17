import type { ChatRole } from "./chat.ts";

export interface LlmMessage {
  role: ChatRole;
  content: string;
}

export interface LlmClient {
  complete(messages: LlmMessage[]): Promise<string>;
}
