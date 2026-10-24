import { cors } from "@elysiajs/cors";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";
import { errorHandler } from "./error-handler.ts";
import { httpTelemetry } from "./telemetry.ts";

/** Must be registered before any routes so its hooks cover them. */
export function createMiddleware(observabilityEnabled = false) {
  return new Elysia({ name: "middleware" })
    .use(observabilityEnabled ? opentelemetry() : new Elysia())
    .use(httpTelemetry())
    .use(cors())
    .use(errorHandler);
}
