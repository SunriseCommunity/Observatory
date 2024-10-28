import { Elysia, StatusMap } from "elysia";
import { cors } from "@elysiajs/cors";
import swagger, { ElysiaSwaggerConfig } from "@elysiajs/swagger";
import { logger } from "@bogeychan/elysia-logger";
import serverTiming from "@elysiajs/server-timing";
import { autoload } from "elysia-autoload";
import { ip } from "elysia-ip";
import { rateLimit } from "elysia-rate-limit";

const isProduction = Bun.env.NODE_ENV !== "development";

const swaggerOptions: ElysiaSwaggerConfig<"/docs"> = {
  documentation: {
    info: {
      title: Bun.env.npm_package_name ?? "Observatory API",
      version: Bun.env.npm_package_version ?? "1.0.0",
      description: Bun.env.npm_package_description ?? "API for Observatory",
    },
  },
  path: "/docs",
};

const loggerOptions = {
  transport: {
    targets: [
      {
        target: "pino-loki",
        level: process.env.LOG_LEVEL_HTTP || "info",
        options: {
          batching: false,
          labels: {
            app: process.env.npm_package_name,
            namespace: process.env.NODE_ENV || "development",
          },
          host: process.env.LOKI_HOST || "http://localhost:3100",
        },
      },
      {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    ],
  },
};

async function setup() {
  return new Elysia({ name: "setup" })
    .use(cors())
    .use(ip())
    .use(rateLimit({ max: 100, duration: 20 * 1000 }))
    .use(serverTiming({ enabled: !isProduction }))
    .use(
      logger({
        ...loggerOptions,
        autoLogging: true,
        customProps(ctx: any) {
          const statusCode = (ctx.code ?? "")
            .replace(/_/g, " ")
            .replace(/[A-Z]/g, (letter: string) => letter.toLowerCase())
            .replace(/(^\w{1})|(\s+\w{1})/g, (letter: string) =>
              letter.toUpperCase()
            );

          return {
            params: ctx.params,
            query: ctx.query,
            res: {
              statusCode:
                StatusMap[statusCode as keyof typeof StatusMap] ??
                ctx.set.status ??
                500,
            },
          };
        },
      })
    )
    .use(await autoload({ dir: "controllers" }))
    .use(swagger(swaggerOptions))
    .get("/favicon.ico", () => Bun.file("./server/public/favicon.ico"));
}

export default setup;
export { loggerOptions };
