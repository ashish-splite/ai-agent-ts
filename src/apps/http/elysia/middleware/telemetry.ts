import { context, metrics, propagation, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { Elysia } from "elysia";
import { createLogger } from "../../../../shared/logger.ts";

const log = createLogger("http");

/**
 * Traces, measures and logs every request. Create after telemetry has started.
 * Metric/attribute names follow the `http.server.duration` convention used by the Grafana dashboards.
 */
export function httpTelemetry() {
  const tracer = trace.getTracer("http");
  const duration = metrics.getMeter("http").createHistogram("http.server.duration", {
    unit: "ms",
    description: "Duration of inbound HTTP requests",
  });
  const routes = new WeakMap<Request, string>();

  return new Elysia({ name: "http-telemetry" })
    .onTransform({ as: "global" }, ({ request, route }) => {
      routes.set(request, route);
    })
    .wrap((handle, request) => (...args: unknown[]) => {
      const method = request.method;
      const parent = propagation.extract(context.active(), Object.fromEntries(request.headers));
      const span = tracer.startSpan(
        method,
        {
          kind: SpanKind.SERVER,
          attributes: { "http.request.method": method, "url.path": new URL(request.url).pathname },
        },
        parent,
      );
      const startedAt = performance.now();

      const finish = (status: number) => {
        // Unmatched paths share one label to keep metric cardinality bounded.
        const route = routes.get(request) ?? "unmatched";
        const durationMs = performance.now() - startedAt;
        span.updateName(`${method} ${route}`);
        span.setAttributes({ "http.route": route, "http.response.status_code": status });
        if (status >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
        duration.record(durationMs, {
          "http.method": method,
          "http.route": route,
          "http.status_code": status,
        });
        log.info("request completed", { method, route, status, durationMs: Math.round(durationMs) });
        span.end();
      };

      return context.with(trace.setSpan(parent, span), async () => {
        try {
          // Elysia types the wrapped fetch loosely; at runtime it resolves to a Response.
          const response = (await handle(...args)) as unknown as Response;
          finish(response.status);
          return response;
        } catch (error) {
          span.recordException(error instanceof Error ? error : String(error));
          finish(500);
          throw error;
        }
      });
    });
}
