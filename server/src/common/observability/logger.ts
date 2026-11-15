import { createPinoLogger } from "@bogeychan/elysia-logger";

import config from "../config";

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

// TODO: Add more loggers here

export default logger;
