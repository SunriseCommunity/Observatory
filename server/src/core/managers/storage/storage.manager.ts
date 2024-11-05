import {
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

export class StorageManager {
    private readonly cacheService: StorageCacheService =
        new StorageCacheService();

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<Beatmap | null | undefined> {
        let entity = await this.cacheService.getBeatmap(ctx);

        if (entity === null) {
            return entity;
        }

        if (ctx.beatmapId && entity === undefined) {
            entity = await getBeatmapById(ctx.beatmapId);
        } else if (ctx.beatmapHash && entity === undefined) {
            entity = await getBeatmapByHash(ctx.beatmapHash);
        }

        if (entity) {
            this.cacheService.insertBeatmap(entity);
        }

        return entity ?? undefined;
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<Beatmapset | null | undefined> {
        let entity = await this.cacheService.getBeatmapSet(ctx);

        if (entity === null) {
            return entity;
        }

        if (ctx.beatmapSetId && entity === undefined) {
            entity = await getBeatmapSetById(ctx.beatmapSetId);
        }

        if (entity) {
            this.cacheService.insertBeatmapset(entity);
        }

        return entity ?? undefined;
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
}
