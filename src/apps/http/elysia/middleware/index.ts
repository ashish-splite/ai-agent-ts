import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { errorHandler } from "./error-handler.ts";

/** Must be registered before any routes so its hooks cover them. */
export const middleware = new Elysia({ name: "middleware" })
  .use(cors())
  .use(errorHandler);
