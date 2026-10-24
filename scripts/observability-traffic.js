import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:8080" },
    duration: { type: "string", default: "120" },
    rate: { type: "string", default: "5" },
    timeout: { type: "string", default: "3000" },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log("Usage: bun run observability:traffic --url http://localhost:8080 --duration 120 --rate 5 --timeout 3000");
  console.log("Duration is seconds; rate is maximum requests/second; timeout is milliseconds. Sends 80% GET /health and 20% GET /observability-not-found.");
  process.exit(0);
}

const base = new URL(values.url);
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
  throw new Error("URL must be HTTP(S) without embedded credentials");
}
const duration = boundedNumber("duration", values.duration, 1, 3600);
const rate = boundedNumber("rate", values.rate, 1, 100);
const timeout = boundedNumber("timeout", values.timeout, 1, 30000);
const runId = randomBytes(8).toString("hex");
const counts = {};
const traceIds = [];
let failures = 0;
let requests = 0;
let totalMs = 0;
let stopped = false;
process.once("SIGINT", () => { stopped = true; });
process.once("SIGTERM", () => { stopped = true; });

console.log(`Traffic run ${runId}: ${base.origin}, ${duration}s, up to ${rate} requests/s`);
const started = performance.now();
const deadline = started + duration * 1000;
while (!stopped && performance.now() < deadline) {
  const path = requests % 5 === 4 ? "/observability-not-found" : "/health";
  const traceId = randomBytes(16).toString("hex");
  if (traceIds.length < 3) traceIds.push(traceId);
  const sent = performance.now();
  try {
    const response = await fetch(new URL(path, base), {
      redirect: "manual",
      headers: {
        traceparent: `00-${traceId}-${randomBytes(8).toString("hex")}-01`,
        "user-agent": `observability-traffic/${runId}`,
      },
      signal: AbortSignal.timeout(Math.max(1, Math.min(timeout, Math.ceil(deadline - sent)))),
    });
    await response.arrayBuffer();
    counts[response.status] = (counts[response.status] ?? 0) + 1;
  } catch {
    failures += 1;
  }
  requests += 1;
  totalMs += performance.now() - sent;
  const waitMs = Math.min(sent + 1000 / rate, deadline) - performance.now();
  if (!stopped && waitMs > 0) await delay(waitMs);
}

console.log(JSON.stringify({
  runId,
  requests,
  statuses: counts,
  networkFailures: failures,
  averageClientMs: Math.round(totalMs / Math.max(requests, 1)),
  elapsedSeconds: Math.round((performance.now() - started) / 1000),
  sampleTraceIds: traceIds,
}, null, 2));
if (failures > 0 || requests === 0) process.exitCode = 1;

function boundedNumber(name, value, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}