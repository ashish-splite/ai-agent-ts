import type { AppConfig } from "../../config/app-config.ts";
import { OpenAiConnection } from "../../infra/openai/openai-connection.ts";
import { PostgresConnection } from "../../infra/postgres/postgres-connection.ts";
import { RedisConnection } from "../../infra/redis/redis-connection.ts";
import { HealthService } from "../../modules/health/health.service.ts";
import { HealthController } from "./elysia/controllers/health.controller.ts";

export class HttpContainer {
  readonly redis: RedisConnection;
  readonly postgres: PostgresConnection;
  readonly openai: OpenAiConnection;
  readonly healthService: HealthService;
  readonly healthController: HealthController;

  constructor(config: AppConfig) {
    this.redis = new RedisConnection(config.redis);
    this.postgres = new PostgresConnection(config.postgres);
    this.openai = new OpenAiConnection(config.openai);
    this.healthService = new HealthService([
      this.redis,
      this.postgres,
    ]);
    this.healthController = new HealthController(this.healthService);
  }
}
