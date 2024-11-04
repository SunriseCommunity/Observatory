import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';

export class DirectClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://osu.direct/api',
                abilities: [
                    ClientAbilities.DownloadBeatmapSetById,
                    ClientAbilities.DownloadBeatmapSetByIdNoVideo,
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
                        routes: ['/'],
                        limit: 50,
                        reset: 60,
                    },
                ],
            },
        );

        logger.info('DirectClient initialized');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
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

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }
}
