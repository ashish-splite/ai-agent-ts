import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const optionalEmail = z.union([z.email(), z.literal("")]);

export const appConfigSchema = z.strictObject({
  server: z.strictObject({
    port: z.number().int().min(1).max(65535),
  }),
  redis: z.strictObject({
    url: z.url({ protocol: /^rediss?$/ }),
  }),
  openai: z.strictObject({
    apiKey: nonEmptyString,
    model: nonEmptyString,
    maxTokens: z.number().int().positive(),
  }),
  mail: z.strictObject({
    from: optionalEmail,
    gmail: z.strictObject({
      user: optionalEmail,
      appPassword: z.string(),
    }),
    allowedRecipients: z.array(z.string())
      .transform((addresses) => addresses.map((address) => address.trim().toLowerCase()).filter(Boolean))
      .pipe(z.array(z.email())),
  }),
});