import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);

export const appConfigSchema = z.strictObject({
  server: z.strictObject({
    port: z.number().int().min(1).max(65535),
  }),
  redis: z.strictObject({
    url: z.url({ protocol: /^rediss?$/ }),
  }),
  postgres: z.strictObject({
    url: z.url({ protocol: /^postgres(ql)?$/ }),
    maxConnections: z.number().int().positive(),
    connectTimeoutSeconds: z.number().int().positive(),
    idleTimeoutSeconds: z.number().int().nonnegative(),
    ssl: z.boolean(),
  }),
  openai: z.strictObject({
    apiKey: nonEmptyString,
  }),
  observability: z.strictObject({
    enabled: z.boolean(),
    serviceName: nonEmptyString,
    otlpEndpoint: z.url({ protocol: /^https?$/ }),
    metricExportIntervalMs: z.number().int().positive(),
  }),
});