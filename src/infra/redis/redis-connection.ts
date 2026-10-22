import { Redis } from "ioredis";
import type { AppConfig } from "../../config/app-config.ts";
import type { HealthCheck } from "../../modules/health/health-check.ts";
import { createLogger } from "../../shared/logger.ts";

const log = createLogger("redis");

/** Owns the single shared Redis connection for the whole app. */
export class RedisConnection implements HealthCheck {
  readonly name = "redis";
  readonly client: Redis;

  constructor(config: AppConfig["redis"]) {
    this.client = new Redis(config.url, { lazyConnect: true });
    this.client.on("error", (error) => log.error("client error", error));
  }

  async connect(): Promise<void> {
    await this.client.connect();
    log.info("connected");
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    log.info("disconnected");
  }

  async check(): Promise<void> {
    const reply = await this.client.ping();
    if (reply !== "PONG") throw new Error(`unexpected PING reply: ${reply}`);
  }
}
