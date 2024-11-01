import { Beatmap, Beatmapset } from '../../../types/beatmap';
import logger from '../../../utils/logger';
import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    ResultWithPrice,
} from '../../abstracts/client/base-client.types';
import { BanchoService } from './bancho-client.service';

export class BanchoClient extends BaseClient {
    private readonly banchoService = new BanchoService(this.baseApi);

    constructor() {
        super(
            {
                baseUrl: 'https://osu.ppy.sh',
                abilities: [
                    ClientAbilities.GetBeatmap,
                    ClientAbilities.GetBeatmapBySetId,
                    ClientAbilities.GetBeatmapSet,
                    ClientAbilities.GetBeatmapSetByBeatmapId,
                ],
            },
            {
                rateLimits: [
                    {
                        route: '/',
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
    ): Promise<ResultWithPrice<Beatmapset | null>> {
        if (ctx.beatmapSetId) {
            return {
                result: await this._getBeatmapSet(ctx.beatmapSetId),
                price: 1,
            };
        } else if (ctx.beatmapId) {
            const beatmap = await this._getBeatmapById(ctx.beatmapId);

            if (!beatmap) {
                return { result: null, price: 1 };
            }

            return {
                result: await this._getBeatmapSet(beatmap.beatmapset_id),
                price: 2,
            };
        } else if (ctx.beatmapHash) {
            return {
                result: null, // Not supported
                price: 0,
            };
        }

        throw new Error('Invalid arguments');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithPrice<Beatmap | null>> {
        if (ctx.beatmapId) {
            return {
                result: await this._getBeatmapById(ctx.beatmapId),
                price: 1,
            };
        } else if (ctx.beatmapHash) {
            return {
                result: null, // Not supported
                price: 0,
            };
        }

        throw new Error('Invalid arguments');
    }

    private async _getBeatmapSet(
        beatmapSetId: number,
    ): Promise<Beatmapset | null> {
        const result = await this.api.get<Beatmapset>(
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
            return null;
        }

        return this._convertBeatmapSet(result.data);
    }

    private async _getBeatmapById(beatmapId: number): Promise<Beatmap | null> {
        const result = await this.api.get<Beatmap>(
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
            return null;
        }

        return this._convertBeatmap(result.data);
    }

    private get osuApiKey() {
        return this.banchoService.getBanchoClientToken();
    }

    private _convertBeatmap(beatmap: Beatmap): Beatmap {
        return beatmap;
    }

    private async _convertBeatmapSet(
        beatmapSet: Beatmapset,
    ): Promise<Beatmapset> {
        return beatmapSet;
    }
}
