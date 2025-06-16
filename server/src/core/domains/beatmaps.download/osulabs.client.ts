import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    DownloadOsuBeatmap,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    ResultWithStatus,
    SearchBeatmapsetsOptions,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { OsulabsBeatmap, OsulabsBeatmapset } from './osulabs-client.types';
import { StorageManager } from '../../managers/storage/storage.manager';

export class OsulabsClient extends BaseClient {
    constructor(storageManager: StorageManager) {
        super(
            {
                baseUrl: 'https://beatmaps.download',
                abilities: [
                    ClientAbilities.GetBeatmapById,
                    ClientAbilities.GetBeatmapSetById,
                    ClientAbilities.GetBeatmapByHash,
                    ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                    ClientAbilities.DownloadBeatmapSetById,
                    ClientAbilities.SearchBeatmapsets,
                    ClientAbilities.DownloadOsuBeatmap,
                ],
            },
            {
                dailyRateLimit: 10000,
                headers: {
                    remaining: 'x-ratelimit-remaining',
                },
                rateLimits: [
                    {
                        routes: ['d/'],
                        limit: 120,
                        reset: 60,
                    },
                    {
                        routes: ['osu/'],
                        limit: 120,
                        reset: 60,
                    },
                    {
                        routes: ['api/v2/search'],
                        limit: 500,
                        reset: 60,
                    },
                    {
                        routes: [
                            'api/v2/s/',
                            'api/v2/b/',
                            'api/v2/md5/',
                            'api/v2/beatmaps',
                            'api/v2/beatmapsets',
                        ],
                        limit: 500,
                        reset: 60,
                    },
                ],
            },
            storageManager,
        );

        logger.info('OsulabsClient initialized');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        const result = await this.api.get<ArrayBuffer>(
            `d/${ctx.beatmapSetId}${ctx.noVideo ? 'n' : ''}`,
            {
                config: {
                    responseType: 'arraybuffer',
                },
            },
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }

    async downloadOsuBeatmap(
        ctx: DownloadOsuBeatmap,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        const result = await this.api.get<ArrayBuffer>(`osu/${ctx.beatmapId}`, {
            config: {
                responseType: 'arraybuffer',
            },
        });

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        if (ctx.beatmapSetId) {
            return await this.getBeatmapSetById(ctx.beatmapSetId);
        }

        throw new Error('Invalid arguments');
    }

    async searchBeatmapsets(
        ctx: SearchBeatmapsetsOptions,
    ): Promise<ResultWithStatus<Beatmapset[] | null>> {
        const result = await this.api.get<Beatmapset[]>(`api/v2/search`, {
            config: {
                params: {
                    query: ctx.query,
                    limit: ctx.limit,
                    offset: ctx.offset,
                    status: ctx.status,
                    mode: ctx.mode,
                },
            },
        });

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: result.data.map((b: OsulabsBeatmapset) =>
                this.convertService.convertBeatmapset(b),
            ),
            status: result.status,
        };
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        if (ctx.beatmapId) {
            return await this.getBeatmapById(ctx.beatmapId);
        } else if (ctx.beatmapHash) {
            return await this.getBeatmapByHash(ctx.beatmapHash);
        }

        throw new Error('Invalid arguments');
    }

    private async getBeatmapSetById(
        beatmapSetId: number,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        const result = await this.api.get<Beatmapset>(
            `api/v2/s/${beatmapSetId}`,
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertService.convertBeatmapset(result.data),
            status: result.status,
        };
    }

    private async getBeatmapById(
        beatmapId: number,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        const result = await this.api.get<Beatmap>(`api/v2/b/${beatmapId}`);

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        var beatmap = result.data as OsulabsBeatmap;
        if (beatmap.set) {
            var beatmapSet = this.convertService.convertBeatmapset(beatmap.set);
            await this.storageManager?.insertBeatmapset(beatmapSet, {
                beatmapSetId: beatmapSet.id,
            });
        }

        return {
            result: this.convertService.convertBeatmap(result.data),
            status: result.status,
        };
    }

    private async getBeatmapByHash(
        beatmapHash: string,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        const result = await this.api.get<Beatmap>(`api/v2/md5/${beatmapHash}`);

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        var beatmap = result.data as OsulabsBeatmap;
        if (beatmap.set) {
            var beatmapSet = this.convertService.convertBeatmapset(beatmap.set);
            await this.storageManager?.insertBeatmapset(beatmapSet, {
                beatmapSetId: beatmapSet.id,
            });
        }

        return {
            result: this.convertService.convertBeatmap(result.data),
            status: result.status,
        };
    }
}
