import config from "@observatory/common/config";
import {
  recordExternalApiRateLimit,
  setExternalApiRateLimitUsage,
} from "@observatory/common/observability/external-api-metrics";
import logger from "@observatory/common/observability/logger";
import { RedisInstance } from "@observatory/common/redis/redis";
import { RedisKeys } from "@observatory/common/types/redis";
import type { AxiosResponse } from "axios";
import type Redis from "ioredis";

import type { BaseApi } from "../api/base-api.abstract";
import { routeTemplate } from "../api/base-api.abstract";
import type { BaseApiOptions } from "../api/base-api.types";
import { ClientAbilities } from "../base-client.types";
import type { DailyRateLimit, RateLimit, RateLimitOptions } from "./rate-limiter.types";

const DEFAULT_RATE_LIMIT = {
  abilities: Object.values(ClientAbilities).filter(
    item => !Number.isNaN(Number(item)),
  ) as ClientAbilities[],
  routes: ["/"],
  limit: 60,
  reset: 60,
};

const DAY_SECONDS = 24 * 60 * 60;
const COOLDOWN_ESCALATION_WINDOW_MS = 6 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export class ApiRateLimiter {
  protected api: BaseApi;
  protected _config: RateLimitOptions;

  public get config(): RateLimitOptions {
    return {
      ...this._config,
      rateLimits: this._config.rateLimits.map(data => ({
        ...data,
        limit: !config.DisableSafeRatelimitMode
          ? Math.floor(data.limit * 0.9)
          : data.limit,
      })),
      dailyRateLimits: config.DisableDailyRateLimit
        ? undefined
        : this._config.dailyRateLimits?.map(dailyLimit => ({
            ...dailyLimit,
            limit: !config.DisableSafeRatelimitMode
              ? Math.floor(dailyLimit.limit * 0.9)
              : dailyLimit.limit,
          })),
    };
  }

  private readonly redis: Redis = RedisInstance;

  private readonly requests = new Map<string[], Map<string, Date>>();

  private cooldownUntil?: number;
  private cooldownMultiplier = 0;
  private lastCooldownAt = 0;

  private readonly redisDailyLimitsKeyPrefix: string;

  private dailyLimits = new Map<string, {
    requestsLeft: number;
    expiresAt: number;
  }>();

  constructor(domainHash: string, api: BaseApi, config: RateLimitOptions) {
    this.api = api;
    this._config = config;
    this.redisDailyLimitsKeyPrefix = `${RedisKeys.DAILY_RATE_LIMIT}${domainHash}`;

    if (!this._config.rateLimits.some(limit => limit.routes.includes("/"))) {
      this._config.rateLimits.push(DEFAULT_RATE_LIMIT);
    }
  }

  public get onCooldownUntil(): number | undefined {
    return this.cooldownUntil;
  }

  public async get<Q>(endpoint: string, options?: BaseApiOptions) {
    const limit = this.getRateLimit(endpoint);
    const dailyLimits = this.getDailyLimits(limit);

    await Promise.all(dailyLimits.map(dailyLimit => this.loadDailyLimit(dailyLimit)));

    // Check and reserve with no await in between, so concurrent calls cannot all pass the same check.
    const blockedBy = this.getBlockReason(limit, dailyLimits);
    if (blockedBy) {
      recordExternalApiRateLimit({ provider: this.api.mirror, http_route: routeTemplate(endpoint), http_request_method: "GET" });
      logger.warn({
        mirror: this.api.mirror,
        endpoint,
        reason: blockedBy,
        ...this.reportLimits(limit, dailyLimits),
      }, "Mirror request skipped");
      return null;
    }

    const requestUid = this.addRequest(limit);
    this.spendDailyLimits(dailyLimits);

    const startedAt = performance.now();
    const response = await this.api.get<Q>(endpoint, options);
    const durationMs = Math.round(performance.now() - startedAt);

    this.getRequestsArray(limit.routes).set(requestUid, new Date());
    this.syncWithResponseHeaders(limit, response);
    this.applyCooldown(endpoint, limit, response);

    const status = response?.status;
    const details = {
      mirror: this.api.mirror,
      endpoint,
      status: status ?? null,
      duration_ms: durationMs,
      ...this.reportLimits(limit, dailyLimits),
    };
    if (!status || status >= 500)
      logger.error(details, "Mirror request completed");
    else if (status >= 400)
      logger.warn(details, "Mirror request completed");
    else
      logger.info(details, "Mirror request completed");

    return response;
  }

  public getCapacity(limit: RateLimit) {
    return {
      limit: limit.limit,
      remaining: this.getRemainingRequests(limit),
    };
  }

  private getBlockReason(limit: RateLimit, dailyLimits: DailyRateLimit[]) {
    if (this.cooldownUntil && this.cooldownUntil > Date.now())
      return "cooldown";

    if (dailyLimits.some(dailyLimit => (this.dailyLimits.get(this.getDailyLimitKey(dailyLimit))?.requestsLeft ?? 0) <= 0))
      return "daily_limit";

    if (this.getRemainingRequests(limit) <= 0)
      return "rate_limit";

    return null;
  }

  private syncWithResponseHeaders<Q>(limit: RateLimit, response: AxiosResponse<Q> | null) {
    const headerRemaining = Number(response?.headers?.[this.config.headers?.remaining ?? "x-ratelimit-remaining"]);
    const remaining = this.getRemainingRequests(limit);

    if (!(headerRemaining < remaining))
      return;

    logger.warn({
      mirror: this.api.mirror,
      routes: limit.routes,
      header_remaining: headerRemaining,
      local_remaining: remaining,
    }, "Mirror reports fewer remaining requests than counted, adding the difference");

    for (let i = 0; i < remaining - headerRemaining; i++) {
      this.addRequest(limit);
    }
  }

  private applyCooldown<Q>(endpoint: string, limit: RateLimit, response: AxiosResponse<Q> | null) {
    if (!response) {
      this.setCooldown(endpoint, null, FIVE_MINUTES_MS);
    }
    else if (response.status === 429) {
      recordExternalApiRateLimit({ provider: this.api.mirror, http_route: routeTemplate(endpoint), http_request_method: "GET" });
      this.setCooldown(endpoint, response.status, limit.reset * 1000);
    }
    else if (response.status === 403) {
      this.setCooldown(endpoint, response.status, 60 * 60 * 1000);
    }
    else if (response.status >= 502) {
      this.setCooldown(endpoint, response.status, FIVE_MINUTES_MS);
    }
  }

  private setCooldown(endpoint: string, status: number | null, durationMs: number) {
    const now = Date.now();

    // Requests already in flight when the mirror broke must not stretch the cooldown again.
    if (this.cooldownUntil && this.cooldownUntil > now)
      return;

    this.cooldownMultiplier = now - this.lastCooldownAt < COOLDOWN_ESCALATION_WINDOW_MS
      ? this.cooldownMultiplier + 1
      : 1;
    this.lastCooldownAt = now;
    this.cooldownUntil = now + durationMs * this.cooldownMultiplier;

    logger.warn({
      mirror: this.api.mirror,
      endpoint,
      status,
      cooldown_ms: durationMs * this.cooldownMultiplier,
      cooldown_multiplier: this.cooldownMultiplier,
      cooldown_until: new Date(this.cooldownUntil).toISOString(),
    }, "Mirror put on cooldown");
  }

  /** Records the bucket usage gauge and returns the limit fields for the log line. */
  private reportLimits(limit: RateLimit, dailyLimits: DailyRateLimit[]) {
    const remaining = this.getRemainingRequests(limit);
    const routes = limit.routes.join(",");
    setExternalApiRateLimitUsage(this.api.mirror, routes, limit.limit - remaining, limit.limit);

    return {
      rate_limit: { routes, remaining, limit: limit.limit, window_s: limit.reset },
      ...(dailyLimits.length > 0 && {
        daily_limits: dailyLimits.map((dailyLimit) => {
          const state = this.dailyLimits.get(this.getDailyLimitKey(dailyLimit));
          return {
            abilities: dailyLimit.abilities?.map(ability => ClientAbilities[ability]).join(",") ?? "global",
            remaining: state?.requestsLeft,
            limit: dailyLimit.limit,
            resets_at: state ? new Date(state.expiresAt).toISOString() : undefined,
          };
        }),
      }),
      ...(this.cooldownUntil && this.cooldownUntil > Date.now() && {
        cooldown_until: new Date(this.cooldownUntil).toISOString(),
      }),
    };
  }

  private getRateLimit(route: string) {
    const { rateLimits } = this.config;
    const limit
      = rateLimits.find(limit => limit.routes.some(r => route.startsWith(r)))
        || rateLimits.find(limit => limit.routes.includes("/"));

    if (!limit) {
      throw new Error(`ApiRateLimiter: Rate limit not found for ${route}`);
    }

    return limit;
  }

  private getDailyLimitKey(dailyLimit: DailyRateLimit): string {
    if (!dailyLimit.abilities?.length) {
      return "global";
    }

    return dailyLimit.abilities.slice().sort((a, b) => a - b).join(",");
  }

  private getDailyLimits(limit: RateLimit): DailyRateLimit[] {
    return (this.config.dailyRateLimits ?? []).filter(dailyLimit =>
      !dailyLimit.abilities?.length
      || dailyLimit.abilities.some(ability => limit.abilities.includes(ability)),
    );
  }

  private async loadDailyLimit(dailyLimit: DailyRateLimit) {
    const key = this.getDailyLimitKey(dailyLimit);
    const cached = this.dailyLimits.get(key);
    if (cached && cached.expiresAt > Date.now())
      return;

    const redisKey = `${this.redisDailyLimitsKeyPrefix}:${key}`;

    try {
      const [[, value], [, ttlSeconds]] = (await this.redis
        .multi()
        .hget(redisKey, "value")
        .ttl(redisKey)
        .exec()) as [[Error | null, string | null], [Error | null, number]];

      // A missing key starts a new day; a key without a TTL is broken and starts one too.
      if (value === null || ttlSeconds < 0) {
        await this.redis.multi().hset(redisKey, "value", dailyLimit.limit).expire(redisKey, DAY_SECONDS).exec();
        this.dailyLimits.set(key, { requestsLeft: dailyLimit.limit, expiresAt: Date.now() + (DAY_SECONDS - 1) * 1000 });
        return;
      }

      // Expire the memory copy a second early so it never outlives the Redis key it mirrors.
      this.dailyLimits.set(key, {
        requestsLeft: Number(value) || 0,
        expiresAt: Date.now() + (ttlSeconds - 1) * 1000,
      });
    }
    catch (error) {
      logger.error({ err: error, mirror: this.api.mirror, daily_limit: key }, "Failed to read mirror daily limit from Redis, assuming the full limit for a minute");
      this.dailyLimits.set(key, { requestsLeft: dailyLimit.limit, expiresAt: Date.now() + 60_000 });
    }
  }

  private spendDailyLimits(dailyLimits: DailyRateLimit[]) {
    for (const dailyLimit of dailyLimits) {
      const key = this.getDailyLimitKey(dailyLimit);
      const state = this.dailyLimits.get(key);
      if (!state)
        continue;

      state.requestsLeft -= 1;
      this.saveDailyLimit(key, state.requestsLeft);
    }
  }

  private async saveDailyLimit(key: string, requestsLeft: number) {
    const redisKey = `${this.redisDailyLimitsKeyPrefix}:${key}`;

    try {
      // HSET recreates an expired key without a TTL; NX gives it one back without moving an existing expiry.
      await this.redis.multi().hset(redisKey, "value", requestsLeft).expire(redisKey, DAY_SECONDS, "NX").exec();
    }
    catch (error) {
      logger.error({ err: error, mirror: this.api.mirror, daily_limit: key }, "Failed to save mirror daily limit to Redis");
    }
  }

  private getRemainingRequests(limit: RateLimit) {
    const requests = this.getRequestsArray(limit.routes);

    requests.forEach((date, uid) => {
      if (Date.now() - date.getTime() > limit.reset * 1000) {
        requests.delete(uid);
      }
    });

    return limit.limit - requests.size;
  }

  private addRequest(limit: RateLimit) {
    const uid = crypto.randomUUID();
    this.getRequestsArray(limit.routes).set(uid, new Date());
    return uid;
  }

  private getRequestsArray(routes: string[]) {
    let requests = this.requests.get(routes);
    if (!requests) {
      requests = new Map();
      this.requests.set(routes, requests);
    }
    return requests;
  }
}
