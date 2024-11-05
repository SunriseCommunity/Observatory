import { HttpStatusCode } from 'axios';

import {
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    DownloadBeatmapSetOptions,
} from '../../abstracts/client/base-client.types';
import { MirrorsManager } from '../mirrors/mirrors.manager';
import { ServerResponse } from './beatmaps-manager.types';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { StorageManager } from '../storage/storage.manager';

const SERVICE_UNAVAILABLE_RESPONSE = {
    data: null,
    status: HttpStatusCode.ServiceUnavailable,
    message: 'Server is currently at its limit. Please try again later. >.<',
};

export class BeatmapsManager {
    private readonly MirrorsManager: MirrorsManager;
    private readonly StorageManager: StorageManager;

    constructor() {
        this.MirrorsManager = new MirrorsManager();
        this.StorageManager = new StorageManager();
    }

    async getBeatmap(ctx: GetBeatmapOptions): Promise<ServerResponse<Beatmap>> {
        const beatmap = await this.StorageManager.getBeatmap(ctx);
        if (beatmap || beatmap === null) {
            return {
                data: beatmap,
                status: beatmap ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
                message: !beatmap ? 'Beatmap not found' : undefined,
            };
        }

        const result = await this.MirrorsManager.getBeatmap(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        this.StorageManager.insertBeatmap(result.result, ctx);

        return {
            data: result.result,
            status: result.status,
            message: result.status === 404 ? 'Beatmap not found' : undefined,
        };
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ServerResponse<Beatmapset>> {
        const beatmapset = await this.StorageManager.getBeatmapSet(ctx);
        if (beatmapset || beatmapset === null) {
            return {
                data: beatmapset,
                status: beatmapset
                    ? HttpStatusCode.Ok
                    : HttpStatusCode.NotFound,
                message: !beatmapset ? 'Beatmap Set not found' : undefined,
            };
        }

        const result = await this.MirrorsManager.getBeatmapSet(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        this.StorageManager.insertBeatmapset(result.result, ctx);

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

        return result.result;
    }
}
