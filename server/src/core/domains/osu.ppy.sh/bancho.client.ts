import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import logger from '../../../utils/logger';
import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    GetBeatmapsOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import { BanchoService } from './bancho-client.service';
import { BanchoBeatmap, BanchoBeatmapset } from './bancho-client.types';

export class BanchoClient extends BaseClient {
    private readonly banchoService = new BanchoService(this.baseApi);

    constructor() {
        super(
            {
                baseUrl: 'https://osu.ppy.sh',
                abilities: [
                    ClientAbilities.GetBeatmapById,
                    ClientAbilities.GetBeatmapBySetId,
                    ClientAbilities.GetBeatmapSetById,
                    ClientAbilities.GetBeatmapSetByBeatmapId,
                    ClientAbilities.GetBeatmaps,
                ],
            },
            {
                rateLimits: [
                    {
                        routes: ['/'],
                        limit: 1200,
                        reset: 60,
                    },
                ],
            },
        );

        logger.info('BanchoClient: initialized');
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
        }

        throw new Error('Invalid arguments');
    }

    async getBeatmaps(
        ctx: GetBeatmapsOptions,
    ): Promise<ResultWithStatus<Beatmap[] | null>> {
        const { ids } = ctx;

        const result = await this.api.get<BanchoBeatmapset[]>(
            `api/v2/beatmaps?${ids.map((id) => `ids[]=${id}`).join('&')}`,
            {
                config: {
                    headers: {
                        Authorization: `Bearer ${await this.osuApiKey}`,
                    },
                },
            },
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: result.data?.beatmaps?.map((b: BanchoBeatmap) =>
                this.convertService.convertBeatmap(b),
            ),
            status: result.status,
        };
    }

    private async getBeatmapSetById(
        beatmapSetId: number,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        const result = await this.api.get<BanchoBeatmapset>(
            `api/v2/beatmapsets/${beatmapSetId}`,
            {
                config: {
                    headers: {
                        Authorization: `Bearer ${await this.osuApiKey}`,
                    },
                },
            },
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
        const result = await this.api.get<BanchoBeatmap>(
            `api/v2/beatmaps/${beatmapId}`,
            {
                config: {
                    headers: {
                        Authorization: `Bearer ${await this.osuApiKey}`,
                    },
                },
            },
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertService.convertBeatmap(result.data),
            status: result.status,
        };
    }

    private get osuApiKey() {
        return this.banchoService.getBanchoClientToken();
    }
}
