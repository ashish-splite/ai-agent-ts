import type { Redis } from "ioredis";
import type { UpdateUserInput, User } from "../../modules/users/user.ts";
import type { UserRepository } from "../../modules/users/user.repository.ts";

const KEY_PREFIX = "user:";
const INDEX_KEY = "users:index";

/** Redis-backed primary data store for users. */
export class RedisUserRepository implements UserRepository {
  constructor(private readonly client: Redis) {}

  async create(user: User): Promise<User> {
    await this.client
      .multi()
      .set(this.key(user.id), JSON.stringify(user))
      .sadd(INDEX_KEY, user.id)
      .exec();
    return user;
  }

  async findAll(): Promise<User[]> {
    const ids = await this.client.smembers(INDEX_KEY);
    if (ids.length === 0) return [];

    const values = await this.client.mget(ids.map((id) => this.key(id)));
    return values
      .filter((value): value is string => value !== null)
      .map((value) => JSON.parse(value) as User)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<User | null> {
    const value = await this.client.get(this.key(id));
    return value ? (JSON.parse(value) as User) : null;
  }

  async update(id: string, patch: UpdateUserInput): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: User = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.client.set(this.key(id), JSON.stringify(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const [removed] = await this.client
      .multi()
      .del(this.key(id))
      .srem(INDEX_KEY, id)
      .exec()
      .then((results) => (results ?? []).map(([, value]) => Number(value)));
    return (removed ?? 0) > 0;
  }

  private key(id: string): string {
    return `${KEY_PREFIX}${id}`;
  }
}
