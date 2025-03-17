import axios from 'axios';
import {
    ClientAbilities,
    ClientOptions,
    DownloadBeatmapSetOptions,
    DownloadOsuBeatmap,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    GetBeatmapsOptions,
    ResultWithStatus,
    SearchBeatmapsets,
} from './base-client.types';
import { BaseApi } from '../api/base-api.abstract';
import { RateLimitOptions } from '../ratelimiter/rate-limiter.types';
import { ApiRateLimiter } from '../ratelimiter/rate-limiter.abstract';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { ConvertService } from '../../services/convert.service';

export const AxiosInstance = axios.create();

AxiosInstance.interceptors.request.use((config) => {
    config.headers['request-startTime'] = new Date().getTime();
    return config;
});

AxiosInstance.interceptors.response.use((response) => {
    const currentTime = new Date().getTime();
    const startTime = response.config.headers['request-startTime'];
    response.headers['request-duration'] = currentTime - startTime;
    return response;
});

export class BaseClient {
    protected config: ClientOptions;
    protected api: ApiRateLimiter;
    protected baseApi: BaseApi;

    protected convertService: ConvertService;

    constructor(config: ClientOptions, rateLimitConfig: RateLimitOptions) {
        this.config = config;

        this.baseApi = new BaseApi(AxiosInstance, {
            baseURL: this.config.baseUrl,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        this.convertService = new ConvertService(this.config.baseUrl);

        this.api = new ApiRateLimiter(this.baseApi, rateLimitConfig);
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        throw new Error('Method not implemented.');
    }

    async getBeatmaps(
        ctx: GetBeatmapsOptions,
    ): Promise<ResultWithStatus<Beatmap[] | null>> {
        throw new Error('Method not implemented.');
    }

    async searchBeatmapsets(
        ctx: SearchBeatmapsets,
    ): Promise<ResultWithStatus<Beatmapset[] | null>> {
        throw new Error('Method not implemented.');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        throw new Error('Method not implemented.');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        throw new Error('Method not implemented.');
    }

    async downloadOsuBeatmap(
        ctx: DownloadOsuBeatmap,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        throw new Error('Method not implemented.');
    }

    getCapacity(ability: ClientAbilities): {
        limit: number;
        remaining: number;
    } {
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
