import { expect, test } from "bun:test";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { InMemoryLogRecordExporter, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { createApp } from "../src/apps/http/elysia/index.ts";
import { httpSpanProcessor } from "../src/infra/otel/telemetry.ts";
import { HealthService } from "../src/modules/health/health.service.ts";
import { createLogger } from "../src/shared/logger.ts";

test("automatic request tracing and Winston logs preserve context without leaking payloads", async () => {
  const spans = new InMemorySpanExporter();
  const records = new InMemoryLogRecordExporter();
  const spanProcessor = new SimpleSpanProcessor(spans);
  const logProcessor = new SimpleLogRecordProcessor({ exporter: records });
  const sdk = new NodeSDK({
    serviceName: "observability-test",
    spanProcessors: [httpSpanProcessor, spanProcessor],
    logRecordProcessors: [logProcessor],
    metricReaders: [],
    instrumentations: [],
  });
  sdk.start();
  const log = createLogger("check-test");
  const healthService = new HealthService([
    { name: "redis", async check() { await Promise.resolve(); log.info("redis checked"); } },
    { name: "postgres", async check() { await Promise.resolve(); log.info("postgres checked"); } },
  ]);
  const app = createApp({ healthService }, true)
    .post("/echo", ({ body }) => body)
    .get("/boom", () => { throw new Error("test failure"); })
    .compile();

  try {
    const traceId = "91a92f3577b34da6a3ce929d0e0e4736";
    const response = await app.handle(new Request("http://localhost/health?token=secret-query", {
      headers: {
        traceparent: `00-${traceId}-00f067aa0ba902b7-01`,
        authorization: "Bearer secret-auth",
        cookie: "session=secret-cookie",
      },
    }));
    expect(response.status).toBe(200);
    await response.text();
    await logProcessor.forceFlush();
    const requestSpans = spans.getFinishedSpans().filter((span) => span.spanContext().traceId === traceId);
    const servers = requestSpans.filter((span) => span.kind === SpanKind.SERVER);
    expect(servers).toHaveLength(1);
    expect(servers[0]!.parentSpanContext?.spanId).toBe("00f067aa0ba902b7");
    for (const name of ["redis", "postgres"]) {
      const check = requestSpans.find((span) => span.name === `health.check ${name}`);
      expect(check).toBeDefined();
      const record = records.getFinishedLogRecords().find((entry) => entry.body === `${name} checked`);
      expect(record?.spanContext?.traceId).toBe(traceId);
      expect(record?.spanContext?.spanId).toBe(check!.spanContext().spanId);
    }

    const echo = await app.handle(new Request("http://localhost/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "secret-payload" }),
    }));
    expect(echo.status).toBe(200);
    await echo.text();
    const missing = await app.handle(new Request("http://localhost/not-a-route"));
    expect(missing.status).toBe(404);
    const failed = await app.handle(new Request("http://localhost/boom"));
    expect(failed.status).toBe(500);
    await new Promise<void>((resolve) => setImmediate(resolve));
    await spanProcessor.forceFlush();
    expect(spans.getFinishedSpans().some((span) =>
      span.kind === SpanKind.SERVER && span.status.code === SpanStatusCode.ERROR)).toBe(true);
    const attributes = JSON.stringify(spans.getFinishedSpans().map((span) => span.attributes));
    for (const secret of ["secret-auth", "secret-cookie", "secret-query", "secret-payload"]) {
      expect(attributes).not.toContain(secret);
    }
  } finally {
    await sdk.shutdown();
  }
}, 15_000);