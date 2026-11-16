import { metrics } from "@opentelemetry/api";
import { Elysia } from "elysia";

import { responseStatus } from "../observability/logger.plugin";

const requestStartTimes = new WeakMap<Request, bigint>();

export const httpMetricsPlugin = new Elysia({ name: "HttpMetricsPlugin" })
  .onRequest(({ request }) => {
    requestStartTimes.set(request, process.hrtime.bigint());
  })
  .onAfterResponse(({ request, responseValue, set, route }) => {
    const startedAt = requestStartTimes.get(request);
    if (!startedAt)
      return;
    requestStartTimes.delete(request);

    getHistogram().record(Number(process.hrtime.bigint() - startedAt) * 1e-9, {
      "http.request.method": request.method,
      "http.response.status_code": responseStatus(responseValue, set),
      "http.route": route || "unmatched",
    });
  })
  .as("global");

// Lazily initialised so the OTel SDK is ready when first called
let histogram: ReturnType<ReturnType<typeof metrics.getMeter>["createHistogram"]> | undefined;

function getHistogram() {
  histogram ??= metrics.getMeter("elysia-http").createHistogram("http.server.request.duration", {
    description: "Duration of HTTP server requests",
    unit: "s",
    advice: {
      explicitBucketBoundaries: [0.003, 0.03, 0.1, 0.3, 1.5, 10],
    },
  });
  return histogram;
}
