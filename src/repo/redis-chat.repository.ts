import type { Redis } from "ioredis";
import type { ChatMessage, ChatSession } from "../domain/chat.ts";
import type { ChatRepository } from "../ports/chat-repository.ts";

const SESSION_KEY = "chat:session:";
const MESSAGES_KEY = "chat:messages:";
const SESSION_INDEX = "chat:sessions";

export class RedisChatRepository implements ChatRepository {
  constructor(private readonly client: Redis) {}

  async createSession(session: ChatSession): Promise<ChatSession> {
    await this.client
      .multi()
      .set(this.sessionKey(session.id), JSON.stringify(session))
      .zadd(SESSION_INDEX, this.score(session.updatedAt), session.id)
      .exec();
    return session;
  }

  async findSession(id: string): Promise<ChatSession | null> {
    const value = await this.client.get(this.sessionKey(id));
    return value ? (JSON.parse(value) as ChatSession) : null;
  }

  async listSessions(): Promise<ChatSession[]> {
    const ids = await this.client.zrevrange(SESSION_INDEX, 0, -1);
    if (ids.length === 0) return [];

    const values = await this.client.mget(ids.map((id) => this.sessionKey(id)));
    return values
      .filter((value): value is string => value !== null)
      .map((value) => JSON.parse(value) as ChatSession);
  }

  async saveSession(session: ChatSession): Promise<ChatSession> {
    await this.client
      .multi()
      .set(this.sessionKey(session.id), JSON.stringify(session))
      .zadd(SESSION_INDEX, this.score(session.updatedAt), session.id)
      .exec();
    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    const results = await this.client
      .multi()
      .del(this.sessionKey(id))
      .del(this.messagesKey(id))
      .zrem(SESSION_INDEX, id)
      .exec();
    return Number(results?.[0]?.[1] ?? 0) > 0;
  }

  async appendMessages(
    sessionId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    if (messages.length === 0) return;
    await this.client.rpush(
      this.messagesKey(sessionId),
      ...messages.map((message) => JSON.stringify(message)),
    );
  }

  async findMessages(
    sessionId: string,
    limit?: number,
  ): Promise<ChatMessage[]> {
    const start = limit && limit > 0 ? -limit : 0;
    const values = await this.client.lrange(
      this.messagesKey(sessionId),
      start,
      -1,
    );
    return values.map((value) => JSON.parse(value) as ChatMessage);
  }

  private sessionKey(id: string): string {
    return `${SESSION_KEY}${id}`;
  }

  private messagesKey(id: string): string {
    return `${MESSAGES_KEY}${id}`;
  }

  private score(isoDate: string): number {
    return new Date(isoDate).getTime();
  }
}
