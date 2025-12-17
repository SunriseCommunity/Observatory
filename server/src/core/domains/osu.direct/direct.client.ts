import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    DownloadOsuBeatmap,
    GetBeatmapOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';
import { Beatmap } from '../../../types/general/beatmap';

export class DirectClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://osu.direct/api',
                abilities: [
                    ClientAbilities.DownloadBeatmapSetById,
                    ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                    ClientAbilities.DownloadOsuBeatmap,
                    ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues,
                    ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues,
                ],
            },
            {
                headers: {
                    remaining: 'ratelimit-remaining',
                    reset: 'ratelimit-reset',
                    limit: 'ratelimit-limit',
                },
                rateLimits: [
                    {
                        abilities: [
                            ClientAbilities.DownloadBeatmapSetById,
                            ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                            ClientAbilities.DownloadOsuBeatmap,
                            ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues,
                            ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues,
                        ],
                        routes: ['/'],
                        limit: 50,
                        reset: 60,
                    },
                ],
            },
        );

        logger.info('DirectClient initialized');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithStatus<Beatmap>> {
        if (ctx.beatmapId) {
            return await this.getBeatmapById(ctx.beatmapId);
        } else if (ctx.beatmapHash) {
            return await this.getBeatmapByHash(ctx.beatmapHash);
        }

        throw new Error('Invalid arguments');
    }

    private async getBeatmapById(
        beatmapId: number,
    ): Promise<ResultWithStatus<Beatmap>> {
        const result = await this.api.get<Beatmap>(`v2/b/${beatmapId}`);

        if (!result || result.status !== 200 || !result.data) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertService.convertBeatmap(result.data),
            status: result.status,
        };
    }

    private async getBeatmapByHash(
        beatmapHash: string,
    ): Promise<ResultWithStatus<Beatmap>> {
        const result = await this.api.get<Beatmap>(`v2/md5/${beatmapHash}`);

        if (!result || result.status !== 200 || !result.data) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertService.convertBeatmap(result.data),
            status: result.status,
        };
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer>> {
        const result = await this.api.get<ArrayBuffer>(
            `d/${ctx.beatmapSetId}`,
            {
                config: {
                    responseType: 'arraybuffer',
                    params: {
                        noVideo: ctx.noVideo ? true : undefined,
                    },
                },
            },
        );

        if (!result || result.status !== 200 || !result.data) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }

    async downloadOsuBeatmap(
        ctx: DownloadOsuBeatmap,
    ): Promise<ResultWithStatus<ArrayBuffer>> {
        const result = await this.api.get<ArrayBuffer>(`osu/${ctx.beatmapId}`, {
            config: {
                responseType: 'arraybuffer',
            },
        });

        if (!result || result.status !== 200 || !result.data) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }
}
