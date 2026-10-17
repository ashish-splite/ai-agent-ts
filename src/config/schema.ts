import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);

export const appConfigSchema = z.strictObject({
  server: z.strictObject({
    port: z.number().int().min(1).max(65535),
  }),
  redis: z.strictObject({
    enabled: z.boolean().default(false),
    url: z.url({ protocol: /^rediss?$/ }),
  }),
  postgres: z.strictObject({
    enabled: z.boolean().default(false),
    url: z.url({ protocol: /^postgres(ql)?$/ }),
    maxConnections: z.number().int().positive(),
    connectTimeoutSeconds: z.number().int().positive(),
    idleTimeoutSeconds: z.number().int().nonnegative(),
    ssl: z.boolean(),
  }),
  openai: z.strictObject({
    enabled: z.boolean().default(false),
    apiKey: z.string(),
    model: nonEmptyString,
    maxTokens: z.number().int().positive(),
    systemPrompt: nonEmptyString,
  }).refine((config) => !config.enabled || config.apiKey.trim().length > 0, {
    path: ["apiKey"],
    message: "An API key is required when OpenAI is enabled",
  }),
});