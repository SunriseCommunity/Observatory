import { AxiosError, AxiosResponse } from 'axios';
import logger from '../../../utils/logger';
import { BaseApi } from '../api/base-api.abstract';
import { BaseApiOptions } from '../api/base-api.types';
import { RateLimit, RateLimitOptions } from './rate-limiter.types';

const DEFAULT_RATE_LIMIT = {
    routes: ['/'],
    limit: 60,
    reset: 60,
};

export class ApiRateLimiter {
    protected api: BaseApi;
    protected config: RateLimitOptions;

    private readonly requests = new Map<string[], Map<string, Date>>();

    constructor(api: BaseApi, config: RateLimitOptions) {
        this.api = api;
        this.config = config;

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
        const isOnCooldown = this.isOnCooldown(endpoint);
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
        const isOnCooldown = this.isOnCooldown(endpoint);
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
        const isOnCooldown = this.isOnCooldown(endpoint);
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
        const isOnCooldown = this.isOnCooldown(endpoint);
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
        const isOnCooldown = this.isOnCooldown(endpoint);
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

    private isOnCooldown(route: string) {
        const limit = this.getRateLimit(route);

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

        this.log(
            `${this.api.axiosConfig.baseURL}/${route} | Routes: [${limit.routes.join(', ')}] | Remaining requests: ${remaining}/${limit.limit}`,
        );

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

        return limit;
    }

    private getRemainingRequests(limit: RateLimit) {
        const requests = this.getRequestsArray(limit.routes);

        const filteredRequests = Array.from(requests).filter(
            ([_, date]) =>
                new Date().getTime() - date.getTime() < limit.reset * 1000,
        );

        return limit.limit - filteredRequests.length;
    }

    private addNewRequest(route: string, replaceUid?: string) {
        const limit = this.getRateLimit(route);

        return this.addRequest(limit, replaceUid);
    }

    private addRequest(limit: RateLimit, replaceUid?: string) {
        const requests = this.getRequestsArray(limit.routes);

        if (replaceUid) requests.delete(replaceUid);

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
