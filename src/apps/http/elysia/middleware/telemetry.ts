import { metrics } from "@opentelemetry/api";
import { Elysia, StatusMap } from "elysia";
import { createLogger } from "../../../../shared/logger.ts";

const log = createLogger("http");

export function httpTelemetry() {
  const duration = metrics.getMeter("http").createHistogram("http.server.duration", {
    unit: "ms",
    description: "Duration of inbound HTTP requests",
  });
  const started = new WeakMap<Request, number>();

  return new Elysia({ name: "http-telemetry" })
    .onRequest(({ request }) => {
      started.set(request, performance.now());
    })
    .onAfterResponse({ as: "global" }, ({ request, route, set, responseValue }) => {
      const method = request.method;
      const matchedRoute = route || "unmatched";
      const status = responseValue instanceof Response
        ? responseValue.status
        : typeof set.status === "string" ? StatusMap[set.status] : set.status ?? 200;
      const durationMs = performance.now() - (started.get(request) ?? performance.now());
      duration.record(durationMs, {
        "http.method": method,
        "http.route": matchedRoute,
        "http.status_code": status,
      });
      log.info("request completed", { method, route: matchedRoute, status, durationMs: Math.round(durationMs) });
    });
}
