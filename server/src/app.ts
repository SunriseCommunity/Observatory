import { beatmapsController, downloadController, osuController } from "@observatory/beatmaps/http";
import { calculatorController } from "@observatory/calculator/http";
import { corsPlugin } from "@observatory/common/http/cors.plugin";
import { ipPlugin } from "@observatory/common/http/ip.plugin";
import { ratelimitPlugin } from "@observatory/common/http/ratelimit.plugin";
import { requestIdPlugin } from "@observatory/common/http/request-id.plugin";
import { serverTimingPlugin } from "@observatory/common/http/server-timing.plugin";
import { loggerPlugin } from "@observatory/common/observability/logger.plugin";
import { docsPlugin, faviconController, rootController } from "@observatory/docs/http";
import { statsController } from "@observatory/stats/http";
import { Elysia } from "elysia";

const api = new Elysia({ name: "setup" })
  .use(corsPlugin)
  .use(ipPlugin)
  .use(requestIdPlugin)
  .use(ratelimitPlugin)
  .use(serverTimingPlugin)
  .use(loggerPlugin)
  .use(rootController)
  .use(statsController)
  .use(beatmapsController)
  .use(calculatorController)
  .use(downloadController)
  .use(osuController)
  .use(docsPlugin)
  .use(faviconController);

export const app = new Elysia().use(api);

export type App = typeof app;
