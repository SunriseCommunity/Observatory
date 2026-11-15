import { logger } from "@bogeychan/elysia-logger";
import { StatusMap } from "elysia";

import { loggerOptions } from "./logger";

export const loggerPlugin = logger({
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
});
