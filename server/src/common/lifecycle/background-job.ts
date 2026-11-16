import { SpanStatusCode, trace } from "@opentelemetry/api";

import logger, { logContext } from "../observability/logger";

type BackgroundJobOptions = {
  name: string;
  intervalMs: number;
  run: () => Promise<unknown>;
};

export type BackgroundJob = {
  stop: () => Promise<void>;
};

export function startBackgroundJob({ name, intervalMs, run }: BackgroundJobOptions): BackgroundJob {
  let running: Promise<void> | undefined;

  const execute = () => {
    if (running) {
      logger.warn(`${name}: previous run is still in progress, skipping this tick`);
      return;
    }

    running = logContext.run({ job: name }, () =>
      trace.getTracer("observatory").startActiveSpan(`job ${name}`, (span) => {
        const started = performance.now();

        return run()
          .then(
            () => {
              logger.info({ duration_ms: Math.round(performance.now() - started) }, `${name}: background job completed`);
            },
            (error: unknown) => {
              span.recordException(error as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              logger.error({ err: error }, `${name}: background job failed`);
            },
          )
          .finally(() => {
            span.end();
            running = undefined;
          });
      }));
  };

  execute();
  const timer = setInterval(execute, intervalMs);

  return {
    async stop() {
      clearInterval(timer);
      await running;
    },
  };
}
