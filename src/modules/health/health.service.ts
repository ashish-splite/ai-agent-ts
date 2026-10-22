import { metrics, SpanStatusCode, trace, type Histogram } from "@opentelemetry/api";
import { createLogger } from "../../shared/logger.ts";
import type { HealthCheck } from "./health-check.ts";

const CHECK_TIMEOUT_MS = 2000;
const log = createLogger("health");
const tracer = trace.getTracer("health");

export type HealthStatus = "up" | "down";

export interface ServiceHealth {
  status: HealthStatus;
  latencyMs: number;
}

export interface HealthReport {
  status: HealthStatus;
  services: Record<string, ServiceHealth>;
}

export class HealthService {
  private readonly duration: Histogram;

  constructor(private readonly checks: HealthCheck[]) {
    this.duration = metrics.getMeter("health").createHistogram("health.check.duration", {
      unit: "ms",
      description: "Duration of dependency health checks",
    });
  }

  async report(): Promise<HealthReport> {
    const results = await Promise.all(
      this.checks.map(async (check) => [check.name, await this.run(check)] as const),
    );
    const services = Object.fromEntries(results);
    const healthy = results.every(([, health]) => health.status === "up");
    return { status: healthy ? "up" : "down", services };
  }

  private run(check: HealthCheck): Promise<ServiceHealth> {
    return tracer.startActiveSpan(`health.check ${check.name}`, async (span) => {
      const health = await this.measure(check);
      span.setAttributes({ "health.service": check.name, "health.status": health.status });
      if (health.status === "down") span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      this.duration.record(health.latencyMs, { service: check.name, status: health.status });
      return health;
    });
  }

  private async measure(check: HealthCheck): Promise<ServiceHealth> {
    const startedAt = performance.now();
    let timer: Timer | undefined;
    try {
      await Promise.race([
        check.check(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`timed out after ${CHECK_TIMEOUT_MS}ms`)),
            CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      return { status: "up", latencyMs: elapsed(startedAt) };
    } catch (error) {
      // Details stay in logs; the public endpoint only reports status.
      log.error(`${check.name} check failed`, error);
      return { status: "down", latencyMs: elapsed(startedAt) };
    } finally {
      clearTimeout(timer);
    }
  }
}

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
