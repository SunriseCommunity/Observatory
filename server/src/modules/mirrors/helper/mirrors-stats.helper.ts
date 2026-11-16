import type { MirrorClient } from "../clients/base-client.types";
import { TimeRange } from "../model/stats.model";

const APPLICATION_START_TIME = Date.now() - Bun.nanoseconds() / 1000000;

const MINUTE = 1000 * 60;

/** Computed per call: a module-level list would freeze "last hour" at process start. */
export function getMirrorsStatsTimeRanges() {
  const now = Date.now();

  return [
    { time: null, name: TimeRange.Lifetime },
    { time: new Date(APPLICATION_START_TIME).toISOString(), name: TimeRange.Session },
    { time: new Date(now - MINUTE * 60).toISOString(), name: TimeRange.Hour },
    { time: new Date(now - MINUTE * 60 * 24).toISOString(), name: TimeRange.Day },
    { time: new Date(now - MINUTE * 60 * 24 * 7).toISOString(), name: TimeRange.Week },
    { time: new Date(now - MINUTE * 60 * 24 * 30).toISOString(), name: TimeRange.Month },
  ];
}

const successfulStatusCodes = [200, 404];
const failedStatusCodes = [500, 502, 503, 504, 429];

export function getMirrorsRequestsQueryData(
  clients: MirrorClient[],
  timeRanges: ReturnType<typeof getMirrorsStatsTimeRanges>,
) {
  return clients.flatMap(c =>
    timeRanges.flatMap(({ time: createdAfter }) => [
      {
        baseUrl: c.client.clientConfig.baseUrl,
        createdAfter,
        statusCodes: successfulStatusCodes,
      },
      {
        baseUrl: c.client.clientConfig.baseUrl,
        createdAfter,
        statusCodes: failedStatusCodes,
      },
      {
        baseUrl: c.client.clientConfig.baseUrl,
        createdAfter,
      },
    ]),
  );
}
