import { metrics } from "@opentelemetry/api";

type RequestAttributes = { provider: string; http_route: string; http_request_method: string };

let instruments: ReturnType<typeof createInstruments> | undefined;
const rateLimitUsage = new Map<string, { provider: string; http_route: string; used: number; limit: number }>();

function createInstruments() {
  const meter = metrics.getMeter("external-apis");
  return {
    requests: meter.createCounter("external.api.requests"),
    rateLimits: meter.createCounter("external.api.rate_limits"),
    duration: meter.createHistogram("external.api.duration", { unit: "s" }),
    rateLimitRequests: meter.createObservableGauge("external.api.rate_limit.requests"),
  };
}

function getInstruments() {
  if (!instruments) {
    instruments = createInstruments();
    metrics.getMeter("external-apis").addBatchObservableCallback(
      (observer) => {
        for (const { provider, http_route, used, limit } of rateLimitUsage.values()) {
          observer.observe(instruments!.rateLimitRequests, used, { provider, http_route, state: "used" });
          observer.observe(instruments!.rateLimitRequests, limit, { provider, http_route, state: "limit" });
          observer.observe(instruments!.rateLimitRequests, limit - used, { provider, http_route, state: "remaining" });
        }
      },
      [instruments.rateLimitRequests],
    );
  }
  return instruments;
}

export function recordExternalApiResponse(
  provider: string,
  route: string,
  method: string,
  statusCode: number,
  durationSeconds: number,
) {
  const attributes = { provider, http_route: route, http_request_method: method, status_code: String(statusCode) };
  const { requests, duration } = getInstruments();
  requests.add(1, attributes);
  duration.record(durationSeconds, attributes);
}

export function recordExternalApiRateLimit(attributes: RequestAttributes) {
  getInstruments().rateLimits.add(1, attributes);
}

/** `route` names the rate-limit bucket, because one mirror has a separate budget per group of routes. */
export function setExternalApiRateLimitUsage(provider: string, route: string, used: number, limit: number) {
  rateLimitUsage.set(`${provider} ${route}`, { provider, http_route: route, used: Math.max(0, used), limit: Math.max(1, limit) });
  getInstruments();
}
