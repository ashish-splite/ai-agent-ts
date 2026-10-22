import { Elysia } from "elysia";
import { NotFoundError, ValidationError } from "../../../../shared/errors.ts";
import { createLogger } from "../../../../shared/logger.ts";

const log = createLogger("app");

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ code, error, set }) => {
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

    log.error("unhandled error", error);
    set.status = 500;
    return { error: "Internal server error" };
  },
);
