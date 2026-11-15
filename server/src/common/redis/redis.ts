import Redis from "ioredis";

import config from "../config";

export const RedisInstance = new Redis({
  port: config.REDIS_PORT,
  host: config.REDIS_HOST,
});
