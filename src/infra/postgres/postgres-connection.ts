import postgres from "postgres";
import type { AppConfig } from "../../config/app-config.ts";
import type { HealthCheck } from "../../modules/health/health-check.ts";
import { createLogger } from "../../shared/logger.ts";

const log = createLogger("postgres");

export class PostgresConnection implements HealthCheck {
  readonly name = "postgres";
  readonly client: ReturnType<typeof postgres>;

  constructor(config: AppConfig["postgres"]) {
    this.client = postgres(config.url, {
      max: config.maxConnections,
      connect_timeout: config.connectTimeoutSeconds,
      idle_timeout: config.idleTimeoutSeconds,
      ssl: config.ssl,
    });
  }

  async connect(): Promise<void> {
    await this.check();
    log.info("connected");
  }

  async disconnect(): Promise<void> {
    await this.client.end({ timeout: 5 });
    log.info("disconnected");
  }

  async check(): Promise<void> {
    await this.client`SELECT 1`;
  }
}