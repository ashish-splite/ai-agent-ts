import { logs, SeverityNumber, type AnyValueMap } from "@opentelemetry/api-logs";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean>;

const SEVERITY: Record<Level, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, error?: unknown, fields?: Fields): void;
}

/** Writes to the console and to OpenTelemetry, correlated with the active span. */
export function createLogger(scope: string): Logger {
  const write = (level: Level, message: string, attributes: AnyValueMap) => {
    const extra = Object.keys(attributes).length > 0 ? [attributes] : [];
    console[level](`[${scope}] ${message}`, ...extra);
    // Resolved per call so loggers created before the SDK starts still export.
    logs.getLogger(scope).emit({
      severityNumber: SEVERITY[level],
      severityText: level.toUpperCase(),
      body: message,
      attributes,
    });
  };

  return {
    debug: (message, fields = {}) => write("debug", message, fields),
    info: (message, fields = {}) => write("info", message, fields),
    warn: (message, fields = {}) => write("warn", message, fields),
    error: (message, error, fields = {}) =>
      write("error", message, { ...fields, ...errorAttributes(error) }),
  };
}

function errorAttributes(error: unknown): AnyValueMap {
  if (error === undefined) return {};
  if (!(error instanceof Error)) return { "exception.message": String(error) };
  return {
    "exception.type": error.name,
    "exception.message": error.message,
    ...(error.stack ? { "exception.stacktrace": error.stack } : {}),
  };
}
