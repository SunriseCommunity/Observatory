import {
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
} from '../../abstracts/client/base-client.types';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import {
    createBeatmap,
    getBeatmapByHash,
    getBeatmapById,
} from '../../../database/models/beatmap';
import {
    createBeatmapset,
    getBeatmapSetById,
} from '../../../database/models/beatmapset';
import { StorageCacheService } from './storage-cache.service';
import { StorageFilesService } from './storage-files.service';

export class StorageManager {
    private readonly cacheService: StorageCacheService;
    private readonly filesService: StorageFilesService;

    constructor() {
        this.cacheService = new StorageCacheService();
        this.filesService = new StorageFilesService(this.cacheService);
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<Beatmap | null | undefined> {
        let entity = await this.cacheService.getBeatmap(ctx);

        if (entity !== undefined) {
            return entity;
        }

        if (ctx.beatmapId) {
            entity = await getBeatmapById(ctx.beatmapId);
        } else if (ctx.beatmapHash) {
            entity = await getBeatmapByHash(ctx.beatmapHash);
        }

        if (entity) {
            this.cacheService.insertBeatmap(entity);
        } else {
            this.cacheService.insertEmptyBeatmap(ctx);
        }

        return entity ?? undefined;
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<Beatmapset | null | undefined> {
        let entity = await this.cacheService.getBeatmapSet(ctx);

        if (entity !== undefined) {
            return entity;
        }

        if (ctx.beatmapSetId) {
            entity = await getBeatmapSetById(ctx.beatmapSetId);
        }

        if (entity) {
            this.cacheService.insertBeatmapset(entity);
        } else {
            this.cacheService.insertEmptyBeatmapset(ctx);
        }

        return entity ?? undefined;
    }

    async getBeatmapsetFile(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ArrayBuffer | undefined | null> {
        let entity = await this.filesService.getBeatmapsetFile(ctx);

        return entity;
    }

    async insertBeatmap(
        beatmap: Beatmap | null,
        ctx: GetBeatmapOptions,
    ): Promise<void> {
        if (beatmap) {
            await createBeatmap(beatmap);
            await this.cacheService.insertBeatmap(beatmap);
        } else {
            await this.cacheService.insertEmptyBeatmap(ctx);
        }
    }

    async insertBeatmapset(
        beatmapset: Beatmapset | null,
        ctx: GetBeatmapSetOptions,
    ): Promise<void> {
        if (beatmapset) {
            await createBeatmapset(beatmapset);
            await this.cacheService.insertBeatmapset(beatmapset);
        } else {
            await this.cacheService.insertEmptyBeatmapset(ctx);
        }
    }

    async insertBeatmapsetFile(
        file: ArrayBuffer | null,
        ctx: DownloadBeatmapSetOptions,
    ): Promise<void> {
        await this.filesService.insertBeatmapsetFile(file, ctx);
    }
}
