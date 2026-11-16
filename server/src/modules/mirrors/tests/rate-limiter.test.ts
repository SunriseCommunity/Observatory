import config from "@observatory/common/config";
import { RedisInstance } from "@observatory/common/redis/redis";
import { RedisKeys } from "@observatory/common/types/redis";
import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";

import type { BaseApi } from "../clients/api/base-api.abstract";
import { ClientAbilities } from "../clients/base-client.types";
import { ApiRateLimiter } from "../clients/ratelimiter/rate-limiter.abstract";
import type { RateLimitOptions } from "../clients/ratelimiter/rate-limiter.types";

const MINUTE = 60 * 1000;

function createLimiter(domainHash: string, status: number, options: Partial<RateLimitOptions> = {}) {
  let calls = 0;
  const api = {
    mirror: "limiter.test",
    get: async () => {
      calls++;
      await Bun.sleep(5);
      return { status, headers: {}, data: null };
    },
  } as unknown as BaseApi;

  const limiter = new ApiRateLimiter(domainHash, api, {
    rateLimits: [{ abilities: [ClientAbilities.GetBeatmapById], routes: ["/"], limit: 10, reset: 60 }],
    ...options,
  });

  return { limiter, calls: () => calls };
}

describe("ApiRateLimiter", () => {
  beforeEach(() => {
    config.DisableSafeRatelimitMode = false;
    config.DisableDailyRateLimit = false;
  });

  afterEach(() => {
    setSystemTime();
  });

  test("Concurrent requests should not get past the limit", async () => {
    const { limiter, calls } = createLimiter("race", 200);

    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.get("api/v2/b/1")),
    );

    // 90% of 10 in safe mode
    expect(calls()).toBe(9);
    expect(results.filter(result => result !== null)).toHaveLength(9);
  });

  test("Failures of requests already in flight should start one cooldown, not one each", async () => {
    const { limiter } = createLimiter("in-flight", 502, {
      rateLimits: [{ abilities: [ClientAbilities.GetBeatmapById], routes: ["/"], limit: 100, reset: 60 }],
    });

    await Promise.all(Array.from({ length: 20 }, () => limiter.get("api/v2/b/1")));

    const cooldownMs = limiter.onCooldownUntil! - Date.now();
    expect(cooldownMs).toBeGreaterThan(4 * MINUTE);
    expect(cooldownMs).toBeLessThanOrEqual(5 * MINUTE);
  });

  test("Cooldown should grow for repeated failures and reset after six quiet hours", async () => {
    const { limiter, calls } = createLimiter("escalation", 502);
    const start = Date.now();

    setSystemTime(new Date(start));
    await limiter.get("api/v2/b/1");
    expect(limiter.onCooldownUntil).toBe(start + 5 * MINUTE);

    setSystemTime(new Date(start + 6 * MINUTE));
    await limiter.get("api/v2/b/1");
    expect(limiter.onCooldownUntil).toBe(start + 6 * MINUTE + 10 * MINUTE);

    const later = start + 6 * MINUTE + 7 * 60 * MINUTE;
    setSystemTime(new Date(later));
    await limiter.get("api/v2/b/1");
    expect(limiter.onCooldownUntil).toBe(later + 5 * MINUTE);

    expect(calls()).toBe(3);
  });

  test("Requests during a cooldown should be skipped", async () => {
    const { limiter, calls } = createLimiter("skip", 502);

    await limiter.get("api/v2/b/1");
    const result = await limiter.get("api/v2/b/1");

    expect(result).toBeNull();
    expect(calls()).toBe(1);
  });

  test("A daily limit key without a TTL should start a new day instead of blocking forever", async () => {
    const redisKey = `${RedisKeys.DAILY_RATE_LIMIT}ttl-repair:global`;
    await RedisInstance.del(redisKey);
    // The state the old limiter could leave behind: HSET recreated the key after it expired, without a TTL.
    await RedisInstance.hset(redisKey, "value", 0);

    const { limiter, calls } = createLimiter("ttl-repair", 200, { dailyRateLimits: [{ limit: 100 }] });

    const result = await limiter.get("api/v2/b/1");

    expect(result).not.toBeNull();
    expect(calls()).toBe(1);

    for (let i = 0; i < 100 && (await RedisInstance.hget(redisKey, "value")) !== "89"; i++) {
      await Bun.sleep(10);
    }
    expect(await RedisInstance.hget(redisKey, "value")).toBe("89");
    expect(await RedisInstance.ttl(redisKey)).toBeGreaterThan(0);
  });
});
