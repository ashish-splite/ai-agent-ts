import type { AppConfig } from "../../config/app-config.ts";
import { OpenAiAgent } from "../../infra/openai/openai-agent.ts";
import { AgentToolRegistry } from "../../infra/openai/tools.ts";
import { PostgresConnection } from "../../infra/postgres/postgres-connection.ts";
import { RedisConnection } from "../../infra/redis/redis-connection.ts";
import { HealthService } from "../../modules/health/health.service.ts";
import { HealthController } from "./elysia/controllers/health.controller.ts";

export class HttpContainer {
  readonly redis: RedisConnection | undefined;
  readonly postgres: PostgresConnection | undefined;
  readonly agentTools: AgentToolRegistry;
  readonly llmClient: OpenAiAgent | undefined;
  readonly healthService: HealthService;
  readonly healthController: HealthController;

  constructor(config: AppConfig) {
    this.redis = config.redis.enabled ? new RedisConnection(config.redis) : undefined;
    this.postgres = config.postgres.enabled ? new PostgresConnection(config.postgres) : undefined;
    this.agentTools = new AgentToolRegistry();
    this.llmClient = config.openai.enabled ? new OpenAiAgent(config.openai, this.agentTools) : undefined;
    this.healthService = new HealthService([
      ...(this.redis ? [this.redis] : []),
      ...(this.postgres ? [this.postgres] : []),
    ]);
    this.healthController = new HealthController(this.healthService);
  }
}
