import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { AppConfig } from "../../config/app-config.ts";

export interface Telemetry {
  /** Flushes pending traces, metrics and logs. */
  shutdown(): Promise<void>;
}

/** Must run before any meters are created: the metrics API has no proxy provider. */
export function startTelemetry(config: AppConfig["observability"]): Telemetry {
  if (!config.enabled) return { shutdown: async () => {} };

  const endpoint = config.otlpEndpoint.replace(/\/+$/, "");
  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })),
    ],
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: config.metricExportIntervalMs,
      }),
    ],
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
      }),
    ],
    instrumentations: [],
  });
  sdk.start();
  return { shutdown: () => sdk.shutdown() };
}
