import { HttpStatusCode } from 'axios';

import {
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    DownloadBeatmapSetOptions,
    GetBeatmapsOptions,
    DownloadOsuBeatmap,
    ResultWithStatus,
    SearchBeatmapsetsOptions,
    GetBeatmapsetsByBeatmapIdsOptions,
} from '../../abstracts/client/base-client.types';
import { MirrorsManager } from '../mirrors/mirrors.manager';
import { ServerResponse } from './beatmaps-manager.types';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { StorageManager } from '../storage/storage.manager';

const INTERNAL_ERROR_RESPONSE = {
    data: null,
    status: HttpStatusCode.InternalServerError,
    message:
        'An unexpected error occurred. Please check the status code for more details and try again later. >.<',
    source: null,
};

export class BeatmapsManager {
    private readonly MirrorsManager: MirrorsManager;
    private readonly StorageManager: StorageManager;

    constructor() {
        this.StorageManager = new StorageManager();
        this.MirrorsManager = new MirrorsManager(this.StorageManager);
    }

    async getBeatmap(ctx: GetBeatmapOptions): Promise<ServerResponse<Beatmap>> {
        const beatmap = await this.StorageManager.getBeatmap(ctx);
        if (beatmap || beatmap === null) {
            return {
                data: beatmap,
                status: beatmap ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
                message: !beatmap ? 'Beatmap not found' : undefined,
                source: 'storage',
            };
        }

        const result = await this.MirrorsManager.getBeatmap(ctx);

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
        }

        this.StorageManager.insertBeatmap(result.result, ctx);

        return {
            data: result.result,
            status: result.status,
            message: result.status === 404 ? 'Beatmap not found' : undefined,
            source: 'mirror',
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
                source: 'storage',
            };
        }

        const result = await this.MirrorsManager.getBeatmapSet(ctx);

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
        }

        this.StorageManager.insertBeatmapset(result.result, ctx);

        return {
            data: result.result,
            status: result.status,
            message: result.status === 404 ? 'Beatmapset not found' : undefined,
            source: 'mirror',
        };
    }

    async searchBeatmapsets(
        ctx: SearchBeatmapsetsOptions,
    ): Promise<ServerResponse<Beatmapset[]>> {
        const searchResult = await this.StorageManager.getSearchResult(ctx);

        if (searchResult) {
            return {
                data: searchResult,
                status: HttpStatusCode.Ok,
                message: undefined,
                source: 'storage',
            };
        }

        const result = await this.MirrorsManager.searchBeatmapsets(ctx);

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
        }

        if (result.result && result.status === 200) {
            this.StorageManager.insertSearchResult(ctx, result.result);
        }

        return {
            data: result.result,
            status: result.status,
            message:
                result.status === 404 ? 'Beatmapsets not found' : undefined,
            source: 'mirror',
        };
    }

    async getBeatmaps(
        ctx: GetBeatmapsOptions,
    ): Promise<ServerResponse<Beatmap[]>> {
        const result = await this.MirrorsManager.getBeatmaps(ctx);

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
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
            source: 'mirror',
        };
    }

    async getBeatmapsetsByBeatmapIds(
        ctx: GetBeatmapsetsByBeatmapIdsOptions,
    ): Promise<ServerResponse<Beatmapset[]>> {
        const beatmapsets =
            await this.StorageManager.getBeatmapSetsByBeatmapIds(ctx);

        const missingIds =
            ctx.beatmapIds.filter(
                (id) =>
                    beatmapsets !== undefined &&
                    !beatmapsets
                        ?.flatMap(
                            (set) => set.beatmaps?.map((map) => map.id) ?? [],
                        )
                        .includes(id),
            ) ?? ctx.beatmapIds;

        if (beatmapsets && missingIds.length === 0) {
            return {
                data: beatmapsets,
                status: HttpStatusCode.Ok,
                message: undefined,
                source: 'storage',
            };
        }

        let result = await this.MirrorsManager.getBeatmapsetsByBeatmapIds({
            beatmapIds: missingIds,
        });

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
        }

        // ! NOTE: Results from getBeatmapsetsByBeatmapIds will include not all beatmaps, so we need to fetch beatmapsets again to fetch all beatmaps with them
        result.result = await Promise.all(
            result.result?.map(
                async (beatmapset) =>
                    await this.getBeatmapSet({
                        beatmapSetId: beatmapset.id,
                    }),
            ) ?? [],
        ).then(
            (results) =>
                results
                    .map((result) => result.data ?? null)
                    .filter((result) => result !== null) as Beatmapset[],
        );

        if (result.result && result.result.length > 0) {
            for (const beatmapset of result.result) {
                this.StorageManager.insertBeatmapset(beatmapset, {
                    beatmapSetId: beatmapset.id,
                });
            }
        }

        const missingIdsFromResult =
            result.result?.filter(
                (set) =>
                    !beatmapsets
                        ?.flatMap((set) => set.beatmaps?.map((map) => map.id))
                        .includes(set.id),
            ) ?? [];

        return {
            data: [...(beatmapsets ?? []), ...(result.result ?? [])],
            status: result.status,
            message:
                missingIdsFromResult.length > 0
                    ? `Some beatmapsets not found: ${missingIdsFromResult.join(', ')}`
                    : undefined,
            source: 'mirror',
        };
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ServerResponse<null | ArrayBuffer>> {
        const beatmapsetFile = await this.StorageManager.getBeatmapsetFile(ctx);

        if (beatmapsetFile) {
            return {
                data: beatmapsetFile,
                status: HttpStatusCode.Ok,
                source: 'storage',
            };
        } else if (beatmapsetFile === null) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Beatmapset not found',
                source: null,
            };
        }

        const result = await this.MirrorsManager.downloadBeatmapSet(ctx);

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
        }

        this.StorageManager.insertBeatmapsetFile(result.result, ctx);

        if (result.status >= 400 || !result.result) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Beatmapset not found',
                source: null,
            };
        }

        return {
            data: result.result,
            status: result.status,
            source: 'mirror',
        };
    }

    async downloadOsuBeatmap(
        ctx: DownloadOsuBeatmap,
    ): Promise<ServerResponse<null | ArrayBuffer>> {
        const beatmapOsuFile = await this.StorageManager.getOsuBeatmapFile(ctx);

        if (beatmapOsuFile) {
            return {
                data: beatmapOsuFile,
                status: HttpStatusCode.Ok,
                source: 'storage',
            };
        } else if (beatmapOsuFile === null) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Osu file not found',
                source: 'storage',
            };
        }

        const result = await this.MirrorsManager.downloadOsuBeatmap(ctx);

        if (result.status >= 500) {
            return this.formatResultAsServerError(result);
        }

        this.StorageManager.insertBeatmapOsuFile(result.result, ctx);

        if (result.status >= 400 || !result.result) {
            return {
                data: null,
                status: HttpStatusCode.NotFound,
                message: 'Osu file not found',
                source: null,
            };
        }

        return {
            data: result.result,
            status: result.status,
            source: 'mirror',
        };
    }

    public async getManagerStats() {
        return {
            storage: await this.StorageManager.getStorageStatistics(),
            mirrors: await this.MirrorsManager.getMirrorsStatistics(),
        };
    }

    private formatResultAsServerError<T>(result: ResultWithStatus<T>) {
        var message = INTERNAL_ERROR_RESPONSE;
        message.status = result.status;

        return message;
    }
}
