import { AxiosError, AxiosResponse } from 'axios';
import logger from '../../../utils/logger';
import { BaseApi } from '../api/base-api.abstract';
import { BaseApiOptions } from '../api/base-api.types';
import { RateLimit, RateLimitOptions } from './rate-limiter.types';
import config from '../../../config';
import Redis from 'ioredis';
import { RedisInstance } from '../../../plugins/redisInstance';
import { RedisKeys } from '../../../types/redis';
import { ClientAbilities } from '../client/base-client.types';

const DEFAULT_RATE_LIMIT = {
    abilities: Object.values(ClientAbilities).filter(
        (item) => !isNaN(Number(item)),
    ) as ClientAbilities[],
    routes: ['/'],
    limit: 60,
    reset: 60,
};

export class ApiRateLimiter {
    protected api: BaseApi;
    protected config: RateLimitOptions;

    private readonly redis: Redis = RedisInstance;

    private readonly requests = new Map<string[], Map<string, Date>>();

    private readonly redisDailyLimitsKey: string;

    private dailyLimit?: {
        requestsLeft: number;
        expiresAt: number;
    } | null;

    constructor(domainHash: string, api: BaseApi, config: RateLimitOptions) {
        this.api = api;
        this.config = config;
        this.redisDailyLimitsKey = `${RedisKeys.DAILY_RATE_LIMIT}${domainHash}`;

        if (config.dailyRateLimit) {
            this.dailyLimit = null;
        }

        if (
            !this.config.rateLimits.find((limit) => limit.routes.includes('/'))
        ) {
            this.config.rateLimits.push(DEFAULT_RATE_LIMIT);
        }

        this.config.rateLimits.forEach((limit) => {
            this.requests.set(limit.routes, new Map());
        });
    }

    public async get<
        Q,
        B extends Record<string, never> = Record<string, never>,
    >(endpoint: string, options?: BaseApiOptions<B>) {
        const isOnCooldown = await this.isOnCooldown(endpoint);
        if (isOnCooldown) return null;

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
        if (isOnCooldown) return null;

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
        if (isOnCooldown) return null;

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
        if (isOnCooldown) return null;

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
        if (isOnCooldown) return null;

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

    public get limiterConfig() {
        return this.config;
    }

    private async isOnCooldown(route: string) {
        const limit = this.getRateLimit(route);
        const dailyLimit = await this.getDailyRateLimitRemaining();

        if (dailyLimit) {
            const daiyLimitRequestsLeft = !config.DisableSafeRatelimitMode
                ? Math.floor(dailyLimit.requestsLeft * 0.9)
                : dailyLimit.requestsLeft;

            if (daiyLimitRequestsLeft <= 0) {
                this.log(
                    `Tried to make request to ${route} while on daily cooldown. Ignored`,
                    'warn',
                );
                return true;
            }
        }

        if (
            this.config.onCooldownUntil &&
            this.config.onCooldownUntil > new Date().getTime()
        ) {
            this.log(
                `Tried to make request to ${route} while on cooldown. Ignored`,
                'warn',
            );
            return true;
        }

        if (this.getRemainingRequests(limit) <= 0) {
            this.log(
                `Tried to make request to ${route} while exceeding rate limit. Ignored`,
                'warn',
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
                  this.config.headers?.remaining ?? 'x-ratelimit-remaining'
              ] ?? this.getRemainingRequests(limit));

        let remaining = this.getRemainingRequests(limit);

        if (headerRemaining < remaining) {
            this.log(
                "Header's remaining requests is lower than actual. Adding missing requests",
                'warn',
            );

            for (let i = 0; i < remaining - headerRemaining; i++) {
                this.addRequest(limit);
            }

            remaining = this.getRemainingRequests(limit);
        }

        const logMessage =
            `${this.api.axiosConfig.baseURL}/${route} | Routes: [${limit.routes.join(', ')}] | Remaining requests: ${remaining}/${limit.limit}` +
            (this.dailyLimit && this.config.dailyRateLimit
                ? ` | Remaining daily requests: ${this.dailyLimit.requestsLeft}/${this.config.dailyRateLimit}, refresh at ${new Date(this.dailyLimit.expiresAt).toLocaleString()}`
                : '');

        this.log(logMessage);

        if (remaining <= 0) {
            this.log(`Rate limit reached for ${route}`, 'warn');
        }

        if (isAxiosError) {
            this.log(
                `Got axios error while making request to ${route}. Setting cooldown of 5 minutes`,
                'warn',
            );
            this.config.onCooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
        }

        if (response?.status === 429) {
            this.log(
                `Rate limit exceeded for ${route}. Setting cooldown`,
                'warn',
            );
            this.config.onCooldownUntil = Date.now() + limit.reset * 1000;
        }

        if (response?.status === 403) {
            this.log(
                `Got forbidden status for ${route}. Setting cooldown of 1 hour`,
                'warn',
            );
            this.config.onCooldownUntil = Date.now() + 60 * 60 * 1000; // 1 hour
        }

        if (response?.status === 502) {
            this.log(
                `Bad gateway for ${route}. Setting cooldown of 5 minutes`,
                'warn',
            );
            this.config.onCooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
        }
    }

    private getRateLimit(route: string) {
        const limit =
            this.config.rateLimits.find((limit) =>
                limit.routes.some((r) => route.startsWith(r)),
            ) ||
            this.config.rateLimits.find((limit) => limit.routes.includes('/'));

        if (!limit) {
            throw new Error(
                `ApiRateLimiter: Rate limit not found for ${route}`,
            );
        }

        return {
            ...limit,
            limit: !config.DisableSafeRatelimitMode
                ? Math.floor(limit.limit * 0.9)
                : limit.limit,
        };
    }

    private async getDailyRateLimitRemaining(): Promise<{
        requestsLeft: number;
        expiresAt: number;
    } | null> {
        const isDailyLimitExists = this.config.dailyRateLimit;
        if (!isDailyLimitExists) return null;

        if (this.dailyLimit && this.dailyLimit.expiresAt > Date.now())
            return this.dailyLimit;

        const result = await this.redis
            .multi()
            .hget(this.redisDailyLimitsKey, 'value')
            .ttl(this.redisDailyLimitsKey)
            .exec();

        if (!result || result.some(([_, v]) => v === null)) {
            await this.updateDailyRateLimitRemaining(0, true);
            return await this.getDailyRateLimitRemaining();
        }

        const [[, rawValue], [, ttlSeconds]] = result;

        const value = isNaN(Number(rawValue)) ? 0 : Number(rawValue);
        const expiresAt = isNaN(Number(ttlSeconds))
            ? 0
            : Number(ttlSeconds) * 1000;

        this.dailyLimit = {
            requestsLeft: value,
            expiresAt: Date.now() + expiresAt,
        };

        return this.dailyLimit;
    }

    private async updateDailyRateLimitRemaining(
        limitSpent: number,
        resetTTL: boolean = false,
    ) {
        const dailyLimit = this.config.dailyRateLimit;
        if (!dailyLimit) return null;

        let currentDailyLimit = dailyLimit;

        if (this.dailyLimit && this.dailyLimit.expiresAt > Date.now()) {
            currentDailyLimit = this.dailyLimit.requestsLeft - limitSpent;

            this.dailyLimit = {
                ...this.dailyLimit,
                requestsLeft: currentDailyLimit,
            };
        }

        await this.redis.hset(
            this.redisDailyLimitsKey,
            'value',
            currentDailyLimit,
        );

        if (resetTTL) await this.redis.expire(this.redisDailyLimitsKey, 86400); // 24 hours

        return;
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
            if (new Date().getTime() - date.getTime() > limit.reset * 1000) {
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

        if (replaceUid) requests.delete(replaceUid);

        if (this.config.dailyRateLimit && replaceUid == null) {
            this.updateDailyRateLimitRemaining(1);
        }

        const uid = crypto.randomUUID();
        requests.set(uid, new Date());

        return uid;
    }

    private getRequestsArray(routes: string[]) {
        const map = this.requests.get(routes);

        if (!map) {
            return (
                this.requests.set(routes, new Map()).get(routes) ??
                new Map<string, Date>()
            );
        } else {
            return map;
        }
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`ApiRateLimiter: ${message}`);
    }
}
