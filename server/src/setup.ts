import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysia/cors";
import type { ElysiaOpenAPIConfig } from "@elysia/openapi";
import { openapi } from "@elysia/openapi";
import serverTiming from "@elysia/server-timing";
import { Elysia, StatusMap } from "elysia";
import { ip } from "elysia-ip";
import { rateLimit } from "elysia-rate-limit";

import config from "./config";
import rootController from "./controllers";
import apiController from "./controllers/api";
import calculatorController from "./controllers/calculator";
import downloadController from "./controllers/d";
import osuController from "./controllers/osu";
import { loggerOptions } from "./utils/logger";

const openapiOptions: ElysiaOpenAPIConfig<true, "/docs"> = {
  documentation: {
    info: {
      title: Bun.env.npm_package_name ?? "Observatory API",
      version: Bun.env.npm_package_version ?? "1.0.0",
      description:
                Bun.env.npm_package_description ?? "API for Observatory",
    },
  },
  exclude: { paths: ["/"] },
  path: "/docs",
};

function requestID() {
  return new Elysia({ name: "request-id" })
    .onRequest(({ set, request: { headers } }) => {
      set.headers["X-Request-ID"] = headers.get("X-Request-ID") || crypto.randomUUID();
    })
    .as("global");
}

function setup() {
  return new Elysia({ name: "setup" })
    .use(cors())
    .use(ip())
    .use(requestID())
    .use(
      rateLimit({
        max: config.RATELIMIT_CALLS_PER_WINDOW,
        duration: config.RATELIMIT_TIME_WINDOW,
        skip(req) {
          const token = req.headers.get("Authorization");
          const validToken = config.IGNORE_RATELIMIT_KEY;

          if (validToken && token === validToken) {
            return true;
          }

          return false;
        },
      }),
    )
    .use(serverTiming({ enabled: !config.IsProduction }))
    .use(
      logger({
        ...loggerOptions,
        autoLogging: true,
        customProps(ctx: any) {
          const { status } = ctx.set;

          return {
            params: ctx.params,
            query: ctx.query,
            requestId: ctx.set.headers["X-Request-ID"],
            res: {
              statusCode: typeof status === "number"
                ? status
                : StatusMap[status as keyof typeof StatusMap] ?? 500,
            },
          };
        },
      }),
    )
    .use(rootController(new Elysia()))
    .use(apiController(new Elysia({ prefix: "/api" })))
    .use(calculatorController(new Elysia({ prefix: "/calculator" })))
    .use(downloadController(new Elysia({ prefix: "/d" })))
    .use(osuController(new Elysia({ prefix: "/osu" })))
    .use(openapi(openapiOptions))
    .get("/favicon.ico", () => Bun.file("./server/public/favicon.ico"));
}

export default setup;
