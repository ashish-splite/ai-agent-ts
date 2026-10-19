import { parseArgs } from "node:util";
import { loadAppConfig } from "./config/app-config.ts";

const USAGE = "Usage: bun run src/main.ts --app <http|worker> [--config <path>] [--data <path>]";

try {
  const { values: args } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      app: { type: "string", short: "a" },
      config: { type: "string", short: "c", default: "config.yaml" },
      data: { type: "string", short: "d", default: "data.txt" },
    },
  });

  const config = loadAppConfig(args.config);

  // Apps are imported lazily so each process loads only its own dependencies.
  switch (args.app) {
    case "http": {
      const { startHttpApp } = await import("./apps/http/app.ts");
      await startHttpApp(config);
      break;
    }
    case "worker": {
      const { startWorkerApp } = await import("./apps/worker/app.ts");
      await startWorkerApp(args.data);
      break;
    }
    default:
      throw new Error(`${args.app ? `Unknown app "${args.app}"` : "Missing --app"}\n${USAGE}`);
  }
} catch (error) {
  console.error("[main]", error instanceof Error ? error.message : error);
  process.exit(1);
}
