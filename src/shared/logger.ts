import { trace } from "@opentelemetry/api";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import winston from "winston";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean>;

const root = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format((info) => {
          const current = trace.getActiveSpan()?.spanContext();
          if (current) {
            info.trace_id = current.traceId;
            info.span_id = current.spanId;
          }
          return info;
        })(),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new OpenTelemetryTransportV3(),
  ],
});

export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, error?: unknown, fields?: Fields): void;
}

/** Writes to the console and to OpenTelemetry, correlated with the active span. */
export function createLogger(scope: string): Logger {
  const write = (level: Level, message: string, attributes: Record<string, unknown>) => {
    root.log(level, message, { ...attributes, scope });
  };

  return {
    debug: (message, fields = {}) => write("debug", message, fields),
    info: (message, fields = {}) => write("info", message, fields),
    warn: (message, fields = {}) => write("warn", message, fields),
    error: (message, error, fields = {}) =>
      write("error", message, { ...fields, ...errorAttributes(error) }),
  };
}

function errorAttributes(error: unknown): Record<string, unknown> {
  if (error === undefined) return {};
  if (!(error instanceof Error)) return { "exception.message": String(error) };
  return {
    "exception.type": error.name,
    "exception.message": error.message,
    ...(error.stack ? { "exception.stacktrace": error.stack } : {}),
  };
}
