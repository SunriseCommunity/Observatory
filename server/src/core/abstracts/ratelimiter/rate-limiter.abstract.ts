import type { AxiosResponse } from "axios";
import { AxiosError } from "axios";
import type Redis from "ioredis";

import config from "../../../config";
import { RedisInstance } from "../../../plugins/redisInstance";
import { RedisKeys } from "../../../types/redis";
import logger from "../../../utils/logger";
import type { BaseApi } from "../api/base-api.abstract";
import type { BaseApiOptions } from "../api/base-api.types";
import { ClientAbilities } from "../client/base-client.types";
import type { DailyRateLimit, RateLimit, RateLimitOptions } from "./rate-limiter.types";

const DEFAULT_RATE_LIMIT = {
  abilities: Object.values(ClientAbilities).filter(
    item => !Number.isNaN(Number(item)),
  ) as ClientAbilities[],
  routes: ["/"],
  limit: 60,
  reset: 60,
};

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

  private timeoutIndefiniteMultiplier = 1;
  private latestTimeoutDate = new Date();

  private readonly redisDailyLimitsKeyPrefix: string;

  private dailyLimits = new Map<string, {
    requestsLeft: number;
    expiresAt: number;
  }>();

  constructor(domainHash: string, api: BaseApi, config: RateLimitOptions) {
    this.api = api;
    this._config = config;
    this.redisDailyLimitsKeyPrefix = `${RedisKeys.DAILY_RATE_LIMIT}${domainHash}`;

    if (
      !this.config.rateLimits.some(limit => limit.routes.includes("/"))
    ) {
      this._config.rateLimits.push(DEFAULT_RATE_LIMIT);
    }

    this.config.rateLimits.forEach((limit) => {
      this.requests.set(limit.routes, new Map());
    });
  }

  public async get<
    Q,
    B extends Record<string, never> = Record<string, never>,
  >(endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const isOnCooldown = await this.isOnCooldown(endpoint);
    if (isOnCooldown)
      return null;

    const requestUid = this.addNewRequest(endpoint);

    return await this.api.get<Q, B>(endpoint, options).then((res) => {
      this.checkRateLimit(endpoint, res);
      this.addNewRequest(endpoint, requestUid);

      return res;
    });
  }

  public async post<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const isOnCooldown = await this.isOnCooldown(endpoint);
    if (isOnCooldown)
      return null;

    const requestUid = this.addNewRequest(endpoint);

    return await this.api.post<Q, B>(endpoint, options).then((res) => {
      this.checkRateLimit(endpoint, res);
      this.addNewRequest(endpoint, requestUid);

      return res;
    });
  }

  public async put<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const isOnCooldown = await this.isOnCooldown(endpoint);
    if (isOnCooldown)
      return null;

    const requestUid = this.addNewRequest(endpoint);

    return await this.api.put<Q, B>(endpoint, options).then((res) => {
      this.checkRateLimit(endpoint, res);
      this.addNewRequest(endpoint, requestUid);

      return res;
    });
  }

  public async patch<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const isOnCooldown = await this.isOnCooldown(endpoint);
    if (isOnCooldown)
      return null;

    const requestUid = this.addNewRequest(endpoint);

    return await this.api.patch<Q, B>(endpoint, options).then((res) => {
      this.checkRateLimit(endpoint, res);
      this.addNewRequest(endpoint, requestUid);

      return res;
    });
  }

  public async delete<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const isOnCooldown = await this.isOnCooldown(endpoint);
    if (isOnCooldown)
      return null;

    const requestUid = this.addNewRequest(endpoint);

    return await this.api.delete<Q, B>(endpoint, options).then((res) => {
      this.checkRateLimit(endpoint, res);
      this.addNewRequest(endpoint, requestUid);

      return res;
    });
  }

  public getCapacity(limit: RateLimit) {
    return {
      limit: limit.limit,
      remaining: this.getRemainingRequests(limit),
    };
  }

  /**
     * @deprecated Use {@link config} instead
     */
  public get limiterConfig() {
    return this.config;
  }

  private async isOnCooldown(route: string) {
    const limit = this.getRateLimit(route);

    const checkedLimitKeys = new Set<string>();

    for (const ability of limit.abilities) {
      const applicableLimits = this.findDailyLimitsForAbility(ability);

      for (const dailyLimit of applicableLimits) {
        const key = this.getDailyLimitKey(dailyLimit);

        if (checkedLimitKeys.has(key))
          continue;

        checkedLimitKeys.add(key);

        const remaining = await this.getDailyRateLimitRemainingForLimit(dailyLimit);
        if (remaining.requestsLeft <= 0) {
          const label = dailyLimit.abilities?.length
            ? `[${dailyLimit.abilities.map(a => ClientAbilities[a]).join(", ")}]`
            : "[global]";
          this.log(
            `Tried to make request to ${route} while on daily cooldown ${label}. Ignored`,
            "warn",
          );
          return true;
        }
      }
    }

    if (
      this.config.onCooldownUntil
      && this.config.onCooldownUntil > Date.now()
    ) {
      this.log(
                `Tried to make request to ${route} while on cooldown. Ignored`,
                "warn",
      );
      return true;
    }

    if (this.getRemainingRequests(limit) <= 0) {
      this.log(
                `Tried to make request to ${route} while exceeding rate limit. Ignored`,
                "warn",
      );
      return true;
    }

    return false;
  }

  private async checkRateLimit<Q>(
    route: string,
    response: AxiosResponse<Q, any> | AxiosError<Q, any> | null,
  ) {
    const limit = this.getRateLimit(route);

    const isAxiosError = response instanceof AxiosError;

    const headerRemaining = isAxiosError
      ? this.getRemainingRequests(limit)
      : (response?.headers[
          this.config.headers?.remaining ?? "x-ratelimit-remaining"
        ] ?? this.getRemainingRequests(limit));

    let remaining = this.getRemainingRequests(limit);

    if (headerRemaining < remaining) {
      this.log(
        "Header's remaining requests is lower than actual. Adding missing requests",
        "warn",
      );

      for (let i = 0; i < remaining - headerRemaining; i++) {
        this.addRequest(limit);
      }

      remaining = this.getRemainingRequests(limit);
    }

    let dailyLimitsLog = "";
    if (this.config.dailyRateLimits?.length) {
      const dailyLimitEntries: string[] = [];
      const loggedKeys = new Set<string>();

      for (const ability of limit.abilities) {
        const applicableLimits = this.findDailyLimitsForAbility(ability);
        for (const dailyLimit of applicableLimits) {
          const key = this.getDailyLimitKey(dailyLimit);
          if (loggedKeys.has(key))
            continue;
          loggedKeys.add(key);

          const cached = this.dailyLimits.get(key);
          if (cached) {
            const label = dailyLimit.abilities?.length
              ? `[${dailyLimit.abilities.map(a => ClientAbilities[a]).join(", ")}]`
              : "[global]";
            dailyLimitEntries.push(
              `${label}: ${cached.requestsLeft}/${dailyLimit.limit}, refresh at ${new Date(cached.expiresAt).toLocaleString()}`,
            );
          }
        }
      }
      if (dailyLimitEntries.length > 0) {
        dailyLimitsLog = ` | Daily limits: ${dailyLimitEntries.join("; ")}`;
      }
    }

    const logMessage
      = `${this.api.axiosConfig.baseURL}/${route} | Routes: [${limit.routes.join(", ")}] | Remaining requests: ${remaining}/${limit.limit}${dailyLimitsLog}`;

    this.log(logMessage);

    if (remaining <= 0) {
      this.log(`Rate limit reached for ${route}`, "warn");
    }

    if (isAxiosError) {
      this.log(
                `Got axios error while making request to ${route}. Setting cooldown of 5 minutes`,
                "warn",
      );
      this.setOnCooldownForDuration(5 * 60 * 1000); // 5 minutes
    }

    if (response?.status === 429) {
      this.log(
                `Rate limit exceeded for ${route}. Setting cooldown`,
                "warn",
      );
      this.setOnCooldownForDuration(limit.reset * 1000); // Set cooldown to rate limit reset time
    }

    if (response?.status === 403) {
      this.log(
                `Got forbidden status for ${route}. Setting cooldown of 1 hour`,
                "warn",
      );
      this.setOnCooldownForDuration(60 * 60 * 1000); // 1 hour
    }

    if (response?.status && response.status >= 502) {
      this.log(
                `Server error (${response.status}) for ${route}. Setting cooldown of 5 minutes`,
                "warn",
      );
      this.setOnCooldownForDuration(5 * 60 * 1000); // 5 minutes
    }

    if (!response) {
      this.log(
                `No response received for ${route}. Setting cooldown of 5 minutes`,
                "warn",
      );
      this.setOnCooldownForDuration(5 * 60 * 1000); // 5 minutes
    }
  }

  private async setOnCooldownForDuration(durationMs: number) {
    if (Date.now() - this.latestTimeoutDate.getTime() < 6 * 60 * 60 * 1000) {
      this.timeoutIndefiniteMultiplier += 1;
    }

    this.latestTimeoutDate = new Date();

    this._config.onCooldownUntil = Date.now()
      + durationMs * this.timeoutIndefiniteMultiplier;
  }

  private getRateLimit(route: string) {
    const limit
      = this.config.rateLimits.find(limit =>
        limit.routes.some(r => route.startsWith(r)),
      )
      || this.config.rateLimits.find(limit => limit.routes.includes("/"));

    if (!limit) {
      throw new Error(
                `ApiRateLimiter: Rate limit not found for ${route}`,
      );
    }

    return limit;
  }

  private getDailyLimitKey(dailyLimit: DailyRateLimit): string {
    if (!dailyLimit.abilities?.length) {
      return "global";
    }

    return dailyLimit.abilities.slice().sort((a, b) => a - b).join(",");
  }

  private findDailyLimitsForAbility(ability: ClientAbilities): DailyRateLimit[] {
    const dailyLimits = this.config.dailyRateLimits;
    if (!dailyLimits?.length)
      return [];

    const applicableLimits: DailyRateLimit[] = [];

    for (const limit of dailyLimits) {
      if (!limit.abilities?.length) {
        applicableLimits.push(limit);
      }
      else if (limit.abilities.includes(ability)) {
        applicableLimits.push(limit);
      }
    }

    return applicableLimits;
  }

  private async getDailyRateLimitRemainingForLimit(
    dailyLimit: DailyRateLimit,
    retryCount = 0,
  ): Promise<{
    requestsLeft: number;
    expiresAt: number;
  }> {
    const key = this.getDailyLimitKey(dailyLimit);
    const cached = this.dailyLimits.get(key);

    if (cached && cached.expiresAt > Date.now())
      return cached;

    if (cached) {
      this.dailyLimits.delete(key);
    }

    const redisKey = `${this.redisDailyLimitsKeyPrefix}:${key}`;
    const result = await this.redis
      .multi()
      .hget(redisKey, "value")
      .ttl(redisKey)
      .exec();

    if (!result || result.some(([_, v]) => v === null)) {
      if (retryCount >= 3) {
        this.log(
          `Failed to initialize daily rate limit for ${key} after ${retryCount} retries. Returning full limit.`,
          "error",
        );
        const fallbackState = {
          requestsLeft: dailyLimit.limit,
          expiresAt: Date.now() + 60000, // Cache for 1 minute before retry
        };
        this.dailyLimits.set(key, fallbackState);
        return fallbackState;
      }
      await this.updateDailyRateLimitRemainingForLimit(dailyLimit, 0, true);
      return await this.getDailyRateLimitRemainingForLimit(dailyLimit, retryCount + 1);
    }

    const [[, rawValue], [, ttlSeconds]] = result;

    const value = Number.isNaN(Number(rawValue)) ? 0 : Number(rawValue);
    const expiresAt = Number.isNaN(Number(ttlSeconds))
      ? 0
      : Number(ttlSeconds) * 1000;

    const limitState = {
      requestsLeft: value,
      expiresAt: Date.now() + expiresAt,
    };

    this.dailyLimits.set(key, limitState);

    return limitState;
  }

  private async updateDailyRateLimitRemainingForLimit(
    dailyLimit: DailyRateLimit,
    limitSpent: number,
    resetTTL = false,
  ) {
    const key = this.getDailyLimitKey(dailyLimit);
    const redisKey = `${this.redisDailyLimitsKeyPrefix}:${key}`;
    const cached = this.dailyLimits.get(key);

    let currentDailyLimit = dailyLimit.limit;

    if (cached && cached.expiresAt > Date.now()) {
      currentDailyLimit = cached.requestsLeft - limitSpent;

      this.dailyLimits.set(key, {
        ...cached,
        requestsLeft: currentDailyLimit,
      });
    }
    else if (cached) {
      this.dailyLimits.delete(key);
    }

    await this.redis.hset(
      redisKey,
      "value",
      currentDailyLimit,
    );

    if (resetTTL)
      await this.redis.expire(redisKey, 86400); // 24 hours
  }

  private getRemainingRequests(limit: RateLimit) {
    const requests = this.getRequestsArray(limit.routes);

    this.clearOutdatedRequests(requests, limit);

    return limit.limit - requests.size;
  }

  private clearOutdatedRequests(
    requests: Map<string, Date>,
    limit: RateLimit,
  ) {
    requests.forEach((date, uid) => {
      if (Date.now() - date.getTime() > limit.reset * 1000) {
        requests.delete(uid);
      }
    });
  }

  private addNewRequest(route: string, replaceUid?: string) {
    const limit = this.getRateLimit(route);

    return this.addRequest(limit, replaceUid);
  }

  private addRequest(limit: RateLimit, replaceUid?: string) {
    const requests = this.getRequestsArray(limit.routes);

    if (replaceUid)
      requests.delete(replaceUid);

    if (this.config.dailyRateLimits?.length && replaceUid == null) {
      const decrementedKeys = new Set<string>();

      for (const ability of limit.abilities) {
        const applicableLimits = this.findDailyLimitsForAbility(ability);

        for (const dailyLimit of applicableLimits) {
          const key = this.getDailyLimitKey(dailyLimit);
          if (!decrementedKeys.has(key)) {
            decrementedKeys.add(key);
            this.updateDailyRateLimitRemainingForLimit(dailyLimit, 1);
          }
        }
      }
    }

    const uid = crypto.randomUUID();
    requests.set(uid, new Date());

    return uid;
  }

  private getRequestsArray(routes: string[]) {
    const map = this.requests.get(routes);

    if (map) {
      return map;
    }

    return (
      this.requests.set(routes, new Map()).get(routes)
      ?? new Map<string, Date>()
    );
  }

  private log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`ApiRateLimiter: ${message}`);
  }
}
