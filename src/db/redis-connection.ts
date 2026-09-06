import { Redis } from "ioredis";
import type { AppConfig } from "../config/app-config.ts";

/** Owns the single shared Redis connection for the whole app. */
export class RedisConnection {
  readonly client: Redis;

  constructor(private readonly config: AppConfig) {
    this.client = new Redis(this.config.redisUrl, { lazyConnect: true });
    this.client.on("error", (error) =>
      console.error("[redis] client error", error),
    );
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log("[redis] connected");
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
