import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';

export class GatariClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://osu.gatari.pw',
                abilities: [ClientAbilities.DownloadBeatmapSetByIdNoVideo],
            },
            {
                rateLimits: [
                    {
                        // My guess is that this is the rate limit for downloading beatmap sets.
                        // Could be higher. Don't know.
                        routes: ['/'],
                        limit: 60,
                        reset: 60,
                    },
                ],
            },
        );

        logger.info('GatariClient initialized');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        const result = await this.api.get<ArrayBuffer>(
            `d/${ctx.beatmapSetId}`,
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
}
