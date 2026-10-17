import { Elysia } from "elysia";
import type { HealthService } from "../../../../modules/health/health.service.ts";

export class HealthController {
  constructor(private readonly service: HealthService) {}

  routes() {
    return new Elysia().get("/health", async ({ set }) => {
      const report = await this.service.report();
      set.status = report.status === "up" ? 200 : 503;
      return report;
    });
  }
}
