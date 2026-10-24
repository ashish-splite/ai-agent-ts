import { Elysia } from "elysia";
import type { HealthService } from "../../../modules/health/health.service.ts";
import { HealthController } from "./controllers/health.controller.ts";
import { createMiddleware } from "./middleware/index.ts";

interface HttpDependencies {
  healthService: HealthService;
}

export function createApp(dependencies: HttpDependencies, observabilityEnabled = false) {
  return new Elysia()
    .use(createMiddleware(observabilityEnabled))
    .use(new HealthController(dependencies.healthService).routes());
}