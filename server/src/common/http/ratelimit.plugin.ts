import { rateLimit } from "elysia-rate-limit";

import config from "../config";

export const ratelimitPlugin = rateLimit({
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
});
