import {
    DownloadBeatmapSetOptions,
    DownloadOsuBeatmap,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    GetBeatmapsetsByBeatmapIdsOptions,
    SearchBeatmapsetsOptions,
} from '../../abstracts/client/base-client.types';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import {
    createBeatmap,
    getBeatmapByHash,
    getBeatmapById,
    getBeatmapCount,
} from '../../../database/models/beatmap';
import {
    createBeatmapset,
    deleteBeatmapsets,
    getBeatmapSetById,
    getBeatmapSetCount,
    getBeatmapSetsByBeatmapIds,
    getUnvalidBeatmapSets,
} from '../../../database/models/beatmapset';
import { StorageCacheService } from './storage-cache.service';
import { StorageFilesService } from './storage-files.service';
import { getBeatmapSetsFilesCount } from '../../../database/models/beatmapsetFile';
import { getBeatmapOsuFileCount } from '../../../database/models/beatmapOsuFile';
import logger from '../../../utils/logger';
import config from '../../../config';

export class StorageManager {
    private readonly cacheService: StorageCacheService;
    private readonly filesService: StorageFilesService;

    constructor() {
        this.cacheService = new StorageCacheService();
        this.filesService = new StorageFilesService(this.cacheService);

        setInterval(
            () => {
                this.clearOldBeatmapsets();
            },
            1000 * 60 * 30,
        ); // 30 minutes

        this.clearOldBeatmapsets();
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
        }

        return entity ?? undefined;
    }

    async getBeatmapSetsByBeatmapIds(
        ctx: GetBeatmapsetsByBeatmapIdsOptions,
    ): Promise<Beatmapset[] | null | undefined> {
        const entities = await getBeatmapSetsByBeatmapIds(ctx.beatmapIds, true);

        if (entities === null) {
            return null;
        }

        return entities ?? undefined;
    }

    async getBeatmapsetFile(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ArrayBuffer | undefined | null> {
        let entity = await this.filesService.getBeatmapsetFile(ctx);

        return entity;
    }

    async getSearchResult(
        ctx: SearchBeatmapsetsOptions,
    ): Promise<Beatmapset[] | undefined> {
        let entity = await this.cacheService.getSearchResult(ctx);

        return entity;
    }

    async insertSearchResult(
        ctx: SearchBeatmapsetsOptions,
        result: Beatmapset[],
    ): Promise<void> {
        for (const beatmapset of result) {
            await this.insertBeatmapset(beatmapset, {
                beatmapSetId: beatmapset.id,
            });
        }

        await this.cacheService.insertSearchResult(ctx, result);
    }

    async getOsuBeatmapFile(
        ctx: DownloadOsuBeatmap,
    ): Promise<ArrayBuffer | undefined | null> {
        let entity = await this.filesService.getOsuBeatmapFile(ctx);

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

    async insertBeatmapOsuFile(
        file: ArrayBuffer | null,
        ctx: DownloadOsuBeatmap,
    ): Promise<void> {
        await this.filesService.insertBeatmapOsuFile(file, ctx);
    }

    public async getStorageStatistics() {
        return {
            database: {
                beatmaps: await getBeatmapCount(),
                beatmapSets: await getBeatmapSetCount(),
                beatmapSetFile: await getBeatmapSetsFilesCount(),
                beatmapOsuFile: await getBeatmapOsuFileCount(),
            },
            files: await this.filesService.getStorageFilesStats(),
            cache: await this.cacheService.getRedisStats(),
        };
    }

    private async clearOldBeatmapsets() {
        if (!config.EnableCronToClearOutdatedBeatmaps) {
            return;
        }

        const beatmapsetsForRemoval = await getUnvalidBeatmapSets();

        const forRemoval = [...beatmapsetsForRemoval];

        if (!forRemoval) {
            this.log('Nothing to remove. Skip cleaning unvalid beatmaps.');
            return;
        }

        this.log(
            `Going to remove ${beatmapsetsForRemoval.length} unvalid beatmapsets from database`,
            'warn',
        );

        await deleteBeatmapsets(beatmapsetsForRemoval);

        this.log('Cleaning unvalid beatmaps is finished!');
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`StorageManager: ${message}`);
    }
}
