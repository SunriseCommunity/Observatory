import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';

export class MinoClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://catboy.best',
                abilities: [
                    ClientAbilities.GetBeatmapById,
                    ClientAbilities.GetBeatmapSetById,
                    ClientAbilities.GetBeatmapByHash,
                    ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                    ClientAbilities.DownloadBeatmapSetById,
                ],
            },
            {
                headers: {
                    remaining: 'X-Ratelimit-Remaining',
                },
                rateLimits: [
                    {
                        routes: ['/'],
                        limit: 60,
                        reset: 60,
                    },
                    {
                        routes: ['/d'],
                        limit: 120,
                        reset: 60,
                    },
                    {
                        routes: ['/osu'],
                        limit: 120,
                        reset: 60,
                    },
                    {
                        routes: ['/api/v2/s', 'api/v2/b', 'api/v2/md5'],
                        limit: 500,
                        reset: 60,
                    },
                ],
            },
        );

        logger.info('MinoClient initialized');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        const result = await this.api.get<ArrayBuffer>(
            // TODO: For 2070848 saves always without video, need to investigate
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

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        if (ctx.beatmapSetId) {
            return await this.getBeatmapSetById(ctx.beatmapSetId);
        }

        throw new Error('Invalid arguments');
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

        return {
            result: this.convertService.convertBeatmap(result.data),
            status: result.status,
        };
    }
}