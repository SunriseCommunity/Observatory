import logger from "../observability/logger";

type BackgroundJobOptions = {
  name: string;
  intervalMs: number;
  run: () => Promise<unknown>;
};

export function startBackgroundJob({ name, intervalMs, run }: BackgroundJobOptions) {
  const execute = () =>
    run().catch((error: unknown) => {
      logger.error({ err: error }, `${name}: background job failed`);
    });

  execute();
  const timer = setInterval(execute, intervalMs);

  return () => clearInterval(timer);
}
