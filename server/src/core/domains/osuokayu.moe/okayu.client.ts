import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import logger from '../../../utils/logger';

export class OkayuClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://direct.osuokayu.moe/api/v1',
                abilities: [ClientAbilities.DownloadBeatmapSetById],
            },
            {
                rateLimits: [],
            },
        );

        logger.info('OkayuClient initialized');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        const result = await this.api.get<ArrayBuffer>(
            `download/${ctx.beatmapSetId}`,
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
