import { createLogger } from "../../shared/logger";
import { startTelemetry } from "../../infra/otel/telemetry";
import type { AppConfig } from "../../config/app-config";

export const WORKER_NAMES = ["persistData", "testing"] as const;

const logger = createLogger("worker");

export async function startWorkerApp(config: AppConfig, workflow: string | undefined): Promise<void> {
  const telemetry = startTelemetry(config.observability);

  try {
    switch (workflow) {
      case "persistData":
        await runPersistDataWorker(logger);
        break;
      case "testing":
        await runTestingWorker(logger);
        break;
      default:
        throw new Error(
          workflow
            ? `Unknown worker workflow "${workflow}". Available workflows: ${WORKER_NAMES.join(", ")}`
            : `Missing --workflow for app "worker". Available workflows: ${WORKER_NAMES.join(", ")}`,
        );
    }
  } finally {
    await telemetry.shutdown();
  }
}

async function runPersistDataWorker(logger: ReturnType<typeof createLogger>): Promise<void> {
  logger.info("persistData workflow running");
}

async function runTestingWorker(logger: ReturnType<typeof createLogger>): Promise<void> {
  logger.info("testing workflow running");
}
