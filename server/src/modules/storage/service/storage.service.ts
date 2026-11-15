import config from "@observatory/common/config";
import logger from "@observatory/common/observability/logger";
import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";

import {
  createBeatmap,
  getBeatmapByHash,
  getBeatmapById,
  getBeatmapCount,
} from "../repository/beatmap.repository";
import { getBeatmapOsuFileCount } from "../repository/beatmap-osu-file.repository";
import {
  createBeatmapset,
  deleteBeatmapsets,
  getBeatmapSetById,
  getBeatmapSetCount,
  getBeatmapSetsByBeatmapIds,
  getUnvalidBeatmapSets,
} from "../repository/beatmapset.repository";
import { getBeatmapSetsFilesCount } from "../repository/beatmapset-file.repository";
import { StorageCacheService } from "./storage-cache.service";
import { StorageFilesService } from "./storage-files.service";

export class StorageService {
  private readonly cacheService: StorageCacheService;
  private readonly filesService: StorageFilesService;

  constructor() {
    this.cacheService = new StorageCacheService();
    this.filesService = new StorageFilesService(this.cacheService);
  }

  async clearOldFiles() {
    await this.filesService.clearOldFiles();
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<Beatmap | null | undefined> {
    if (!ctx.beatmapId && !ctx.beatmapHash && !ctx.beatmapFilename) {
      throw new Error("Either beatmapId, beatmapHash or beatmapFilename is required");
    }

    let entity = await this.cacheService.getBeatmap(ctx);

    if (entity !== undefined) {
      return entity;
    }

    if (ctx.beatmapId) {
      entity = await getBeatmapById(ctx.beatmapId);
    }
    else if (ctx.beatmapHash) {
      entity = await getBeatmapByHash(ctx.beatmapHash);
    }
    else if (ctx.beatmapFilename) {
      // We don't store filenames in database, skip
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
    const entity = await this.filesService.getBeatmapsetFile(ctx);

    return entity;
  }

  async getSearchResult(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<Beatmapset[] | undefined> {
    const entity = await this.cacheService.getSearchResult(ctx);

    return entity;
  }

  async insertSearchResult(
    ctx: SearchBeatmapsetsOptions,
    result: Beatmapset[],
  ): Promise<void> {
    // TODO: This is disabled for now. While mino sends full beatmapsets, bancho doesn't. Saving such beatmapsets is wrong and will corrupt database. I don't have time to implement partial beatmapset saving for now, so just skip saving search results until I do it.
    // for (const beatmapset of result) {
    //   await this.insertBeatmapset(beatmapset, {
    //     beatmapSetId: beatmapset.id,
    //   });
    // }

    try {
      await this.cacheService.insertSearchResult(ctx, result);
    }
    catch (error) {
      logger.error({ err: error }, "StorageManager: insertSearchResult failed");
    }
  }

  async getOsuBeatmapFile(
    ctx: DownloadOsuBeatmap,
  ): Promise<ArrayBuffer | undefined | null> {
    const entity = await this.filesService.getOsuBeatmapFile(ctx);

    return entity;
  }

  async insertBeatmap(
    beatmap: Beatmap | null,
    ctx: GetBeatmapOptions,
  ): Promise<void> {
    try {
      if (beatmap) {
        await createBeatmap(beatmap);
        await this.cacheService.insertBeatmap(beatmap);

        if (ctx.beatmapFilename) {
          await this.cacheService.insertBeatmapByFilename(beatmap, ctx.beatmapFilename);
        }
      }
      else {
        await this.cacheService.insertEmptyBeatmap(ctx);
      }
    }
    catch (error) {
      logger.error({ err: error }, "StorageManager: insertBeatmap failed");
    }
  }

  async insertBeatmapset(
    beatmapset: Beatmapset | null,
    ctx: GetBeatmapSetOptions,
  ): Promise<void> {
    try {
      if (beatmapset) {
        await createBeatmapset(beatmapset);
        await this.cacheService.insertBeatmapset(beatmapset);
      }
      else {
        await this.cacheService.insertEmptyBeatmapset(ctx);
      }
    }
    catch (error) {
      logger.error({ err: error }, "StorageManager: insertBeatmapset failed");
    }
  }

  async insertBeatmapsetFile(
    file: ArrayBuffer | null,
    ctx: DownloadBeatmapSetOptions,
  ): Promise<void> {
    try {
      await this.filesService.insertBeatmapsetFile(file, ctx);
    }
    catch (error) {
      logger.error({ err: error }, "StorageManager: insertBeatmapsetFile failed");
    }
  }

  async insertBeatmapOsuFile(
    file: ArrayBuffer | null,
    ctx: DownloadOsuBeatmap,
  ): Promise<void> {
    try {
      await this.filesService.insertBeatmapOsuFile(file, ctx);
    }
    catch (error) {
      logger.error({ err: error }, "StorageManager: insertBeatmapOsuFile failed");
    }
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

  async clearOldBeatmapsets() {
    if (!config.EnableCronToClearOutdatedBeatmaps) {
      return;
    }

    const beatmapsetsForRemoval = await getUnvalidBeatmapSets();

    const forRemoval = [...beatmapsetsForRemoval];

    if (!forRemoval) {
      this.log("Nothing to remove. Skip cleaning unvalid beatmaps.");
      return;
    }

    this.log(
            `Going to remove ${beatmapsetsForRemoval.length} unvalid beatmapsets from database`,
            "warn",
    );

    await deleteBeatmapsets(beatmapsetsForRemoval);

    this.log("Cleaning unvalid beatmaps is finished!");
  }

  private log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`StorageManager: ${message}`);
  }
}
