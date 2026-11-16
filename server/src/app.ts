import { beatmapsController, downloadController, osuController } from "@observatory/beatmaps/http";
import { calculatorController } from "@observatory/calculator/http";
import { corsPlugin } from "@observatory/common/http/cors.plugin";
import { httpMetricsPlugin } from "@observatory/common/http/http-metrics.plugin";
import { ipPlugin } from "@observatory/common/http/ip.plugin";
import { ratelimitPlugin } from "@observatory/common/http/ratelimit.plugin";
import { serverTimingPlugin } from "@observatory/common/http/server-timing.plugin";
import { loggerPlugin } from "@observatory/common/observability/logger.plugin";
import { OTLPPlugin } from "@observatory/common/observability/otlp.plugin";
import { docsPlugin, faviconController, rootController } from "@observatory/docs/http";
import { statsController } from "@observatory/stats/http";
import { Elysia } from "elysia";

const api = new Elysia({ name: "setup" })
  .use(OTLPPlugin)
  .use(corsPlugin)
  .use(ipPlugin)
  .use(loggerPlugin)
  .use(httpMetricsPlugin)
  .use(ratelimitPlugin)
  .use(serverTimingPlugin)
  .use(rootController)
  .use(statsController)
  .use(beatmapsController)
  .use(calculatorController)
  .use(downloadController)
  .use(osuController)
  .use(docsPlugin)
  .use(faviconController);

export const app = new Elysia().use(api);
