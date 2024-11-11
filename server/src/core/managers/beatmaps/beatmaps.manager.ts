import { HttpStatusCode } from 'axios';

import {
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    DownloadBeatmapSetOptions,
    SearchBeatmapsets,
    GetBeatmapsOptions,
    DownloadOsuBeatmap,
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
                message: !beatmapset ? 'Beatmapset not found' : undefined,
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
            message: result.status === 404 ? 'Beatmapset not found' : undefined,
        };
    }

    async searchBeatmapsets(
        ctx: SearchBeatmapsets,
    ): Promise<ServerResponse<Beatmapset[]>> {
        const result = await this.MirrorsManager.searchBeatmapsets(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        if (result.result && result.result.length > 0) {
            for (const beatmapset of result.result) {
                this.StorageManager.insertBeatmapset(beatmapset, {
                    beatmapSetId: beatmapset.id,
                });
            }
        }

        return {
            data: result.result,
            status: result.status,
            message:
                result.status === 404 ? 'Beatmapsets not found' : undefined,
        };
    }

    async getBeatmaps(
        ctx: GetBeatmapsOptions,
    ): Promise<ServerResponse<Beatmap[]>> {
        const result = await this.MirrorsManager.getBeatmaps(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        if (result.result && result.result.length > 0) {
            for (const beatmap of result.result) {
                this.StorageManager.insertBeatmap(beatmap, {
                    beatmapId: beatmap.id,
                });
            }
        }

        return {
            data: result.result,
            status: result.status,
            message: result.status === 404 ? 'Beatmaps not found' : undefined,
        };
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ServerResponse<null> | ArrayBuffer> {
        const beatmapsetFile = await this.StorageManager.getBeatmapsetFile(ctx);

        if (beatmapsetFile) {
            return beatmapsetFile;
        } else if (beatmapsetFile === null) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Beatmapset not found',
            };
        }

        const result = await this.MirrorsManager.downloadBeatmapSet(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        this.StorageManager.insertBeatmapsetFile(result.result, ctx);

        if (result.status >= 400 || !result.result) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Beatmapset not found',
            };
        }

        return result.result;
    }

    async downloadOsuBeatmap(
        ctx: DownloadOsuBeatmap,
    ): Promise<ServerResponse<null> | ArrayBuffer> {
        const beatmapOsuFile = await this.StorageManager.getOsuBeatmapFile(ctx);

        if (beatmapOsuFile) {
            return beatmapOsuFile;
        } else if (beatmapOsuFile === null) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Osu file not found',
            };
        }

        const result = await this.MirrorsManager.downloadOsuBeatmap(ctx);

        if (result.status >= 500) {
            return SERVICE_UNAVAILABLE_RESPONSE;
        }

        this.StorageManager.insertBeatmapOsuFile(result.result, ctx);

        if (result.status >= 400 || !result.result) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Beatmapset not found',
            };
        }

        return result.result;
    }
}
