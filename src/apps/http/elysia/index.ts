import { Elysia } from "elysia";
import type { HttpContainer } from "../container.ts";
import { middleware } from "./middleware/index.ts";

export function createApp(controllers: Pick<
  HttpContainer,
  "healthController"
>) {
  return new Elysia()
    .use(middleware)
    .use(controllers.healthController.routes());
}