import type { AppConfig } from "../../config/app-config.ts";
import { createApp } from "./elysia/index.ts";
import { HttpContainer } from "./container.ts";

const SHUTDOWN_TIMEOUT_MS = 10_000;

export async function startHttpApp(config: AppConfig): Promise<void> {
  const container = new HttpContainer(config);
  const app = createApp(container);

  try {
    await container.redis.connect();
    await container.postgres.connect();
    app.listen(config.server.port);
  } catch (error) {
    container.redis.client.disconnect();
    await container.postgres.disconnect();
    throw error;
  }
  console.log(`[http] listening on http://localhost:${config.server.port}`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => {
      console.error("[http] shutdown timed out");
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
      console.error("[http] shutdown failed", error);
      exitCode = 1;
    } finally {
      clearTimeout(deadline);
    }
    process.exit(exitCode);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
