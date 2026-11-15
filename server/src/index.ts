import config from "@observatory/common/config";
import logger from "@observatory/common/observability/logger";
import { startMirrorsCron } from "@observatory/mirrors/cron";
import { startStorageCron } from "@observatory/storage/cron";

import { app } from "./app";

startStorageCron();
startMirrorsCron();

app.listen({ port: config.PORT }, ({ hostname, port }) =>
  logger.info(`🔭 Observatory is running at http://${hostname}:${port}`));
