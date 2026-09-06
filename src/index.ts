import { Elysia } from "elysia";
import { Container } from "./container.ts";
import { NotFoundError, ValidationError } from "./domain/errors.ts";

const container = new Container();
await container.start();

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (error instanceof NotFoundError) {
      set.status = 404;
      return { error: error.message };
    }

    if (error instanceof ValidationError) {
      set.status = 400;
      return { error: error.message };
    }

    if (code === "VALIDATION") {
      set.status = 422;
      return { error: error.all.map((issue) => issue.summary) };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Route not found" };
    }

    console.error("[app] unhandled error", error);
    set.status = 500;
    return { error: "Internal server error" };
  })
  .get("/health", () => ({
    status: "ok",
    storage: "redis",
  }))
  .use(container.userController.routes())
  .listen(container.config.port);

console.log(`[app] listening on http://localhost:${container.config.port}`);

const shutdown = async () => {
  await app.stop();
  await container.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
