import { AsyncLocalStorage } from "node:async_hooks";

import { createPinoLogger } from "@bogeychan/elysia-logger";
import { isSpanContextValid, trace } from "@opentelemetry/api";

import config from "../config";

export const logContext = new AsyncLocalStorage<Record<string, string>>();

const logger = createPinoLogger({
  mixin() {
    const spanContext = trace.getActiveSpan()?.spanContext();
    return spanContext && isSpanContextValid(spanContext)
      ? { ...logContext.getStore(), trace_id: spanContext.traceId }
      : { ...logContext.getStore() };
  },
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
                labels: {
                  app: process.env.npm_package_name || "unknown",
                  namespace: process.env.NODE_ENV || "development",
                },
                host: config.LOKI_HOST,
              },
            },
          ]
        : []),
    ],
  },
});

// bounded so it wouldn't block shutdown indefinitely
export function flushLogger(timeoutMs = 2_000): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    logger.flush(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export default logger;
