import { createPinoLogger } from "@bogeychan/elysia-logger";

import config from "../config";
import type { AxiosResponseLog } from "../core/abstracts/api/base-api.types";
import { loggerOptions } from "../setup";

const logger = createPinoLogger({
  ...loggerOptions,
});

export function logExternalRequest(data: AxiosResponseLog) {
  const level
    = data.status < 400 ? "info" : data.status < 500 ? "warn" : "error";

  logger[level]({
    axios: {
      ...data,
      data: config.IsDebug || level !== "info" ? data : undefined,
    },
  });
}

// TODO: Add more loggers here

export default logger;
