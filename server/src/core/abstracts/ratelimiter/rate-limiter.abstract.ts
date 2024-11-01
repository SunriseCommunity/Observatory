import { AxiosResponse } from 'axios';
import logger from '../../../utils/logger';
import { BaseApi } from '../api/base-api.abstract';
import { BaseApiOptions } from '../api/base-api.types';
import { RateLimit, RateLimitOptions } from './rate-limiter.types';

export class ApiRateLimiter {
    protected api: BaseApi;
    protected config: RateLimitOptions;

    private readonly requests = new Map<string, Date[]>();

    constructor(api: BaseApi, config: RateLimitOptions) {
        this.api = api;
        this.config = config;

        if (!this.config.rateLimits.find((limit) => limit.route === '/')) {
            throw new Error(
                'ApiRateLimiter: Please declare rate limit for default route (/)',
            );
        }
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

        this.addRequest(limit.route);

        const headerRemaining =
            response?.headers[
                this.config.headers?.remaining ?? 'x-ratelimit-remaining'
            ] ?? this.getRemainingRequests(limit);

        const remaining = this.getRemainingRequests(limit);

        if (headerRemaining < remaining) {
            for (let i = 0; i < remaining - headerRemaining; i++) {
                this.addRequest(limit.route);
            }
        }

        this.log(
            `Checking rate limit for ${response?.config.baseURL}/${route}, remaining: ${remaining}`,
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
                new RegExp(`^${limit.route}`).test(route),
            ) || this.config.rateLimits.find((limit) => limit.route === '/');

        if (!limit) {
            throw new Error(
                `ApiRateLimiter: Rate limit not found for ${route}`,
            );
        }

        return limit;
    }

    private getRemainingRequests(limit: RateLimit) {
        const requests = this.requests.get(limit.route) ?? [];

        const filteredRequests = requests.filter(
            (date) =>
                new Date().getTime() - date.getTime() < limit.reset * 1000,
        );

        return limit.limit - filteredRequests.length;
    }

    private addRequest(route: string) {
        if (!this.requests.has(route)) {
            this.requests.set(route, []);
        }

        this.requests.get(route)?.push(new Date());
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`ApiRateLimiter: ${message}`);
    }
}
