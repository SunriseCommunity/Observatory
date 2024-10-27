import { Elysia } from "elysia";

import log from "./utils/logger";
import setup from "./setup";

const port = Bun.env.PORT ?? 3000;

const app = new Elysia()
  .use(setup())
  .listen({ port }, ({ hostname, port }) =>
    log.info(`🔭 Observatory is running at http://${hostname}:${port}`)
  );

export { app };
export type App = typeof app;
