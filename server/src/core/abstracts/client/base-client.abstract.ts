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
    SearchBeatmapsetsOptions,
} from './base-client.types';
import { BaseApi } from '../api/base-api.abstract';
import { RateLimitOptions } from '../ratelimiter/rate-limiter.types';
import { ApiRateLimiter } from '../ratelimiter/rate-limiter.abstract';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { ConvertService } from '../../services/convert.service';
import { StorageManager } from '../../managers/storage/storage.manager';

export class BaseClient {
    protected storageManager?: StorageManager;

    protected config: ClientOptions;
    protected api: ApiRateLimiter;
    protected baseApi: BaseApi;

    protected convertService: ConvertService;

    constructor(
        config: ClientOptions,
        rateLimitConfig: RateLimitOptions,
        storageManager?: StorageManager,
    ) {
        this.config = config;

        this.storageManager = storageManager;

        this.baseApi = new BaseApi(axios.create(), {
            baseURL: this.config.baseUrl,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        this.convertService = new ConvertService(this.config.baseUrl);

        const domainHash = Bun.hash(this.config.baseUrl).toString();
        this.api = new ApiRateLimiter(
            domainHash,
            this.baseApi,
            rateLimitConfig,
        );
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
        ctx: SearchBeatmapsetsOptions,
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
