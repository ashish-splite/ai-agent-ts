import { Elysia } from "elysia";
import type { HttpContainer } from "../container.ts";
import { middleware } from "./middleware/index.ts";

export function createApp(controllers: Pick<
  HttpContainer,
  "healthController" | "userController" | "chatController"
>) {
  return new Elysia()
    .use(middleware)
    .use(controllers.healthController.routes())
    .use(controllers.userController.routes())
    .use(controllers.chatController.routes());
}