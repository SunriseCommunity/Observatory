import axios from 'axios';
import {
    ClientAbilities,
    ClientOptions,
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    ResultWithPrice,
} from './base-client.types';
import { BaseApi } from '../api/base-api.abstract';
import { Beatmap, Beatmapset } from '../../../types/beatmap';
import { RateLimitOptions } from '../ratelimiter/rate-limiter.types';
import { ApiRateLimiter } from '../ratelimiter/rate-limiter.abstract';

export class BaseClient {
    protected config: ClientOptions;
    protected api: ApiRateLimiter;
    protected baseApi: BaseApi;

    constructor(config: ClientOptions, rateLimitConfig: RateLimitOptions) {
        this.config = config;

        this.baseApi = new BaseApi(axios.create(), {
            baseURL: this.config.baseUrl,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        this.api = new ApiRateLimiter(this.baseApi, rateLimitConfig);
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ResultWithPrice<Beatmapset | null>> {
        throw new Error('Method not implemented.');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithPrice<Beatmap | null>> {
        throw new Error('Method not implemented.');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithPrice<ArrayBuffer | null>> {
        throw new Error('Method not implemented.');
    }

    getCurrentCapacity(ability: ClientAbilities): number {
        const limit =
            this.api.limiterConfig.rateLimits.find((rateLimit) =>
                rateLimit.abilities?.includes(ability),
            ) ||
            this.api.limiterConfig.rateLimits.find((rateLimit) =>
                rateLimit.routes.includes('/'),
            );

        if (!limit) {
            throw new Error(
                `No rate limit found for ${this.config.baseUrl} / ${ability}`,
            );
        }

        return this.api.getCapacity(limit);
    }

    get clientConfig(): ClientOptions {
        return this.config;
    }
}
