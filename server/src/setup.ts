import { Elysia } from "elysia";
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

const loggerOptions = isProduction
  ? {}
  : {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    };

async function setup() {
  return new Elysia({ name: "setup" })
    .use(cors())
    .use(ip())
    .use(rateLimit({ max: 100, duration: 20 * 1000 }))
    .use(serverTiming({ enabled: !isProduction }))
    .use(logger(loggerOptions))
    .use(await autoload({ dir: "controllers" }))
    .use(swagger(swaggerOptions));
}

export default setup;
export { loggerOptions };
