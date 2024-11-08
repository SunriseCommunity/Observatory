import { AxiosResponse } from 'axios';
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

    private readonly requests = new Map<string[], Date[]>();

    constructor(api: BaseApi, config: RateLimitOptions) {
        this.api = api;
        this.config = config;

        if (
            !this.config.rateLimits.find((limit) => limit.routes.includes('/'))
        ) {
            this.config.rateLimits.push(DEFAULT_RATE_LIMIT);
        }

        this.config.rateLimits.forEach((limit) => {
            this.requests.set(limit.routes, []);
        });
    }

    public async get<
        Q,
        B extends Record<string, never> = Record<string, never>,
    >(endpoint: string, options?: BaseApiOptions<B>) {
        return this.isOnCooldown(endpoint)
            ? null
            : await this.api.get<Q, B>(endpoint, options).then((res) => {
                  this.checkRateLimit(endpoint, res);
                  return res;
              });
    }

    public async post<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        return this.isOnCooldown(endpoint)
            ? null
            : await this.api.post<Q, B>(endpoint, options).then((res) => {
                  this.checkRateLimit(endpoint, res);
                  return res;
              });
    }

    public async put<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        return this.isOnCooldown(endpoint)
            ? null
            : await this.api.put<Q, B>(endpoint, options).then((res) => {
                  this.checkRateLimit(endpoint, res);
                  return res;
              });
    }

    public async patch<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        return this.isOnCooldown(endpoint)
            ? null
            : await this.api.patch<Q, B>(endpoint, options).then((res) => {
                  this.checkRateLimit(endpoint, res);
                  return res;
              });
    }

    public async delete<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        return this.isOnCooldown(endpoint)
            ? null
            : await this.api.delete<Q, B>(endpoint, options).then((res) => {
                  this.checkRateLimit(endpoint, res);
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
            limit.onCooldownUntil &&
            limit.onCooldownUntil > new Date().getTime()
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
        response: AxiosResponse<Q, any> | null,
    ) {
        const limit = this.getRateLimit(route);

        this.addRequest(limit);

        const headerRemaining =
            response?.headers[
                this.config.headers?.remaining ?? 'x-ratelimit-remaining'
            ] ?? this.getRemainingRequests(limit);

        const remaining = this.getRemainingRequests(limit);

        if (headerRemaining < remaining) {
            this.log(
                "Header's remaining requests is lower than actual. Adding missing requests",
                'warn',
            );

            for (let i = 0; i < remaining - headerRemaining; i++) {
                this.addRequest(limit);
            }
        }

        this.log(
            `${this.api.axiosConfig.baseURL}/${route} | Routes: [${limit.routes.join(', ')}] | Remaining requests: ${remaining}/${limit.limit}`,
        );

        if (remaining <= 0) {
            this.log(`Rate limit reached for ${route}`, 'warn');
        }

        if (response?.status === 429) {
            this.log(
                `Rate limit exceeded for ${route}. Setting cooldown`,
                'warn',
            );
            limit.onCooldownUntil = Date.now() + limit.reset * 1000;
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

        const filteredRequests = requests.filter(
            (date) =>
                new Date().getTime() - date.getTime() < limit.reset * 1000,
        );

        return limit.limit - filteredRequests.length;
    }

    private addRequest(limit: RateLimit) {
        const requests = this.getRequestsArray(limit.routes);

        requests.push(new Date());
    }

    private getRequestsArray(routes: string[]) {
        const map = this.requests.get(routes);

        if (!map) {
            return this.requests.set(routes, []).get(routes) ?? [];
        } else {
            return map;
        }
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`ApiRateLimiter: ${message}`);
    }
}
