import type { Context } from "elysia";
import { Elysia, StatusMap } from "elysia";

import logger, { logContext } from "./logger";

const startedAt = new WeakMap<Request, number>();

export function responseStatus(responseValue: unknown, set: Context["set"]): number {
  if (responseValue instanceof Response)
    return responseValue.status;
  return typeof set.status === "number" ? set.status : StatusMap[set.status ?? "OK"];
}

export const loggerPlugin = new Elysia({ name: "LoggerPlugin" })
  .onRequest(({ request, set }) => {
    const requestId = request.headers.get("X-Request-ID") || crypto.randomUUID(); // TODO: Not sure if we need it?
    set.headers["X-Request-ID"] = requestId;
    startedAt.set(request, performance.now());
    logContext.enterWith({ request_id: requestId });
  })
  .onAfterResponse(({ request, responseValue, set, route, path }) => {
    const statusCode = responseStatus(responseValue, set);
    const started = startedAt.get(request);
    const details = {
      request,
      route: route || path,
      status_code: statusCode,
      duration_ms: started === undefined ? undefined : Math.round(performance.now() - started),
      data_source: set.headers["X-Data-Source"],
    };

    if (statusCode >= 500)
      logger.error(details, "HTTP request completed");
    else if (statusCode >= 400)
      logger.warn(details, "HTTP request completed");
    else
      logger.info(details, "HTTP request completed");
  })
  .as("global");
