import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const INTERVAL_MS = 5_000;
const DATA_FILE_NAME = "data.txt";

/** Relative directories resolve against the current working directory. */
export async function startWorkerApp(dataDir: string): Promise<void> {
  mkdirSync(dataDir, { recursive: true });
  const dataFile = join(dataDir, DATA_FILE_NAME);
  let counter = readOrCreateCounter(dataFile);
  console.log(`[worker] started at counter ${counter}, writing to ${dataFile}`);

  const timer = setInterval(() => {
    try {
      counter += 1;
      writeFileSync(dataFile, `${counter}\n`);
      console.log(`[worker] counter: ${counter}`);
    } catch (error) {
      console.error("[worker] failed to write counter", error);
    }
  }, INTERVAL_MS);

  const shutdown = () => {
    clearInterval(timer);
    console.log(`[worker] stopped at counter ${counter}`);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function readOrCreateCounter(dataFile: string): number {
  if (!existsSync(dataFile)) {
    writeFileSync(dataFile, "0\n");
    console.log(`[worker] created ${dataFile}`);
    return 0;
  }
  const value = Number(readFileSync(dataFile, "utf8").trim());
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${dataFile} must contain a non-negative integer`);
  }
  return value;
}
