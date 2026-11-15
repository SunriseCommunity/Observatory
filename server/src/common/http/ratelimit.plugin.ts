import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";

import config from "../config";

export const ratelimitPlugin = new Elysia({ name: "RateLimitPlugin" }).use(
  rateLimit({
    max: config.RATELIMIT_CALLS_PER_WINDOW,
    duration: config.RATELIMIT_TIME_WINDOW,
    // The default generator reads app.server, which is null inside a plugin instance, so every client shared one bucket.
    generator: (_request, _server, { ip }: { ip: string }) => ip,
    skip: (req) => {
      const validToken = config.IGNORE_RATELIMIT_KEY;
      return Boolean(validToken) && req.headers.get("Authorization") === validToken;
    },
  }),
);
