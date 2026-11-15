import logger from "../observability/logger";

type ShutdownStep = {
  name: string;
  run: () => unknown;
};

const SHUTDOWN_DEADLINE_MS = 8000; // Docker sends SIGKILL 10s after SIGTERM by default

export function registerShutdown(steps: ShutdownStep[]) {
  let stopping = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (stopping)
      return;
    stopping = true;

    logger.info(`Received ${signal}, shutting down`);

    setTimeout(() => {
      logger.error("Shutdown deadline exceeded, forcing exit");
      // eslint-disable-next-line unicorn/no-process-exit -- process entry point: a hung resource must not outlive the stop deadline
      process.exit(1);
    }, SHUTDOWN_DEADLINE_MS).unref();

    for (const step of steps) {
      try {
        await step.run();
      }
      catch (error) {
        logger.error({ err: error }, `Shutdown step "${step.name}" failed`);
      }
    }

    logger.info("Shutdown complete");
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
