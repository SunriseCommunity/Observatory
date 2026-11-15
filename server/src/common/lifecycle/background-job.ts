import logger from "../observability/logger";

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

    running = run()
      .then(
        () => {},
        (error: unknown) => {
          logger.error({ err: error }, `${name}: background job failed`);
        },
      )
      .finally(() => {
        running = undefined;
      });
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
