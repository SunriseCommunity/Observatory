import { createPinoLogger } from "@bogeychan/elysia-logger";

import config from "../config";
import type { AxiosResponseLog } from "../core/abstracts/api/base-api.types";

export const loggerOptions = {
  transport: {
    targets: [
      ...(config.IsAutomatedTesting
        ? []
        : [
            {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            },
          ]),
      ...(config.LOKI_HOST
        ? [
            {
              target: "pino-loki",
              options: {
                batching: false,
                labels: {
                  app:
                                      process.env.npm_package_name || "unknown",
                  namespace:
                                      process.env.NODE_ENV || "development",
                },
                host: config.LOKI_HOST,
              },
            },
          ]
        : []),
    ],
  },
};

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
