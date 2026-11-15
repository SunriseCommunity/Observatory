import config from "@observatory/common/config";
import { closeDatabase } from "@observatory/common/database/client";
import { registerShutdown } from "@observatory/common/lifecycle/shutdown";
import logger from "@observatory/common/observability/logger";
import { RedisInstance } from "@observatory/common/redis/redis";
import { startMirrorsCron } from "@observatory/mirrors/cron";
import { startStorageCron } from "@observatory/storage/cron";

import { app } from "./app";

const jobs = [...startStorageCron(), startMirrorsCron()];

app.listen({ port: config.PORT }, ({ hostname, port }) =>
  logger.info(`🔭 Observatory is running at http://${hostname}:${port}`));

registerShutdown([
  { name: "http and background jobs", run: () => Promise.all([app.stop(), ...jobs.map(job => job.stop())]) },
  { name: "redis", run: () => RedisInstance.quit() },
  { name: "database", run: closeDatabase },
]);
