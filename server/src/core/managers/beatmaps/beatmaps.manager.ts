import { HttpStatusCode } from 'axios';
import { Beatmap, Beatmapset } from '../../../types/beatmap';
import {
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    DownloadBeatmapSetOptions,
} from '../../abstracts/client/base-client.types';
import { MirrorsManager } from '../mirrors/mirrors.manager';
import { ServerResponse } from './beatmaps-manager.types';

const SERVICE_UNAVAILABLE_RESPONSE = {
    data: null,
    status: HttpStatusCode.ServiceUnavailable,
    message: 'Server is currently at its limit. Please try again later. >.<',
};

export class BeatmapsManager {
    private readonly MirrorsManager: MirrorsManager;

    constructor() {
        this.MirrorsManager = new MirrorsManager();
    }

    // TODO: Add local storage for beatmaps here

    async getBeatmap(ctx: GetBeatmapOptions): Promise<ServerResponse<Beatmap>> {
        const result = await this.MirrorsManager.getBeatmap(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        return {
            data: result.result,
            status: result.status,
            message: result.status === 404 ? 'Beatmap not found' : undefined,
        };
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ServerResponse<Beatmapset>> {
        const result = await this.MirrorsManager.getBeatmapSet(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        return {
            data: result.result,
            status: result.status,
            message:
                result.status === 404 ? 'Beatmap Set not found' : undefined,
        };
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ServerResponse<null> | ArrayBuffer> {
        const result = await this.MirrorsManager.downloadBeatmapSet(ctx);

        if (result.status >= 500 || !result.result) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        return result.result
    }
}
