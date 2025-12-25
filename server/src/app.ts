import { Elysia } from "elysia";

import config from "./config";
import setup from "./setup";
import log from "./utils/logger";

const port = config.PORT;

const app = new Elysia()
  .use(setup())
  .listen({ port }, ({ hostname, port }) =>
    log.info(`🔭 Observatory is running at http://${hostname}:${port}`));

export { app };
export type App = typeof app;
