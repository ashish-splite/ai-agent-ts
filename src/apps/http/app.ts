import type { AppConfig } from "../../config/app-config.ts";
import { startTelemetry } from "../../infra/otel/telemetry.ts";
import { createLogger } from "../../shared/logger.ts";
import { createApp } from "./elysia/index.ts";
import { HttpContainer } from "./container.ts";

const SHUTDOWN_TIMEOUT_MS = 10_000;
const log = createLogger("http");

export async function startHttpApp(config: AppConfig): Promise<void> {
  const telemetry = startTelemetry(config.observability);
  const container = new HttpContainer(config);
  const app = createApp(
    { healthService: container.healthService },
    config.observability.enabled,
  );

  try {
    await container.redis.connect();
    await container.postgres.connect();
    app.listen(config.server.port);
  } catch (error) {
    container.redis.client.disconnect();
    await container.postgres.disconnect();
    await telemetry.shutdown();
    throw error;
  }
  log.info(`listening on http://localhost:${config.server.port}`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => {
      log.error("shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    let exitCode = 0;
    try {
      try {
        await app.stop(false);
      } finally {
        const results = await Promise.allSettled([
          container.redis.disconnect(),
          container.postgres.disconnect(),
        ]);
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      }
    } catch (error) {
      log.error("shutdown failed", error);
      exitCode = 1;
    } finally {
      // Flushed last so shutdown logs are exported too.
      await telemetry.shutdown().catch((error) => {
        console.error("[http] telemetry shutdown failed", error);
      });
      clearTimeout(deadline);
    }
    process.exit(exitCode);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
