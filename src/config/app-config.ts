import { YAML } from "bun";
import { readFileSync } from "node:fs";
import type { z } from "zod";
import { appConfigSchema } from "./schema.ts";

export type AppConfig = z.infer<typeof appConfigSchema>;

/** Relative paths resolve against the current working directory. */
export function loadAppConfig(path: string): AppConfig {
  let parsed: unknown;
  try {
    parsed = YAML.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`Unable to read or parse configuration file: ${path}`);
  }

  const result = appConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "config"} (${issue.code})`)
      .join("; ");
    throw new Error(`Invalid configuration file ${path}: ${issues}`);
  }

  return result.data;
}
