import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';

export class NerinyanClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://api.nerinyan.moe',
                abilities: [
                    ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                    ClientAbilities.DownloadBeatmapSetById,
                ],
            },
            {
                rateLimits: [],
            },
        );

        logger.info('NerinyanClient initialized');
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
                        noVideo: ctx.noVideo ? true : false,
                    },
                },
            },
        );

        if (!result || result.status !== 200 || !result.data) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }
}
