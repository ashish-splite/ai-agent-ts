import { Elysia } from "elysia";
import type { HttpContainer } from "../container.ts";
import { middleware } from "./middleware/index.ts";
import { httpTelemetry } from "./middleware/telemetry.ts";

export function createApp(controllers: Pick<
  HttpContainer,
  "healthController"
>) {
  return new Elysia()
    .use(httpTelemetry())
    .use(middleware)
    .use(controllers.healthController.routes());
}