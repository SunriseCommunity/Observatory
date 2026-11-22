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

import { BeatmapRepository } from "../repository/beatmap.repository";
import { BeatmapOsuFileRepository } from "../repository/beatmap-osu-file.repository";
import { BeatmapsetRepository } from "../repository/beatmapset.repository";
import { BeatmapsetFileRepository } from "../repository/beatmapset-file.repository";
import { StorageCacheRepository } from "../repository/storage-cache.repository";
import { StorageFilesHelper } from "./storage-files.helper";

const STORAGE_STATISTICS_TTL_MS = 60 * 1000;

let storageStatistics: {
  expiresAt: number;
  value: Awaited<ReturnType<typeof readStorageStatistics>>;
} | undefined;

export abstract class StorageHelper {
  static async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<Beatmap | null | undefined> {
    if (!ctx.beatmapId && !ctx.beatmapHash && !ctx.beatmapFilename) {
      throw new Error("Either beatmapId, beatmapHash or beatmapFilename is required");
    }

    let entity = await StorageCacheRepository.getBeatmap(ctx);

    if (entity !== undefined) {
      return entity;
    }

    if (ctx.beatmapId) {
      entity = await BeatmapRepository.getById(ctx.beatmapId);
    }
    else if (ctx.beatmapHash) {
      entity = await BeatmapRepository.getByHash(ctx.beatmapHash);
    }
    else if (ctx.beatmapFilename) {
      // We don't store filenames in database, skip
    }

    if (entity) {
      StorageCacheRepository.insertBeatmap(entity).catch((error: unknown) => {
        logger.error({ err: error }, "StorageHelper: caching beatmap failed");
      });
    }

    return entity ?? undefined;
  }

  static async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<Beatmapset | null | undefined> {
    let entity = await StorageCacheRepository.getBeatmapSet(ctx);

    if (entity !== undefined) {
      return entity;
    }

    if (ctx.beatmapSetId) {
      entity = await BeatmapsetRepository.getById(ctx.beatmapSetId);
    }

    if (entity) {
      StorageCacheRepository.insertBeatmapset(entity).catch((error: unknown) => {
        logger.error({ err: error }, "StorageHelper: caching beatmapset failed");
      });
    }

    return entity ?? undefined;
  }

  static async getBeatmapSetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<Beatmapset[]> {
    return await BeatmapsetRepository.getByBeatmapIds(ctx.beatmapIds);
  }

  static async getBeatmapsetFile(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ArrayBuffer | undefined | null> {
    return await StorageFilesHelper.getBeatmapsetFile(ctx);
  }

  static async getSearchResult(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<Beatmapset[] | undefined> {
    return await StorageCacheRepository.getSearchResult(ctx);
  }

  static async insertSearchResult(
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
      await StorageCacheRepository.insertSearchResult(ctx, result);
    }
    catch (error) {
      logger.error({ err: error }, "StorageHelper: insertSearchResult failed");
    }
  }

  static async getOsuBeatmapFile(
    ctx: DownloadOsuBeatmap,
  ): Promise<ArrayBuffer | undefined | null> {
    return await StorageFilesHelper.getOsuBeatmapFile(ctx);
  }

  static async insertBeatmap(
    beatmap: Beatmap | null,
    ctx: GetBeatmapOptions,
  ): Promise<void> {
    try {
      if (beatmap) {
        await BeatmapRepository.createMany([beatmap]);
        await StorageCacheRepository.insertBeatmap(beatmap);

        if (ctx.beatmapFilename) {
          await StorageCacheRepository.insertBeatmapByFilename(beatmap, ctx.beatmapFilename);
        }
      }
      else {
        await StorageCacheRepository.insertEmptyBeatmap(ctx);
      }
    }
    catch (error) {
      logger.error({ err: error }, "StorageHelper: insertBeatmap failed");
    }
  }

  static async insertBeatmapset(
    beatmapset: Beatmapset | null,
    ctx: GetBeatmapSetOptions,
  ): Promise<void> {
    try {
      if (beatmapset) {
        await BeatmapsetRepository.create(beatmapset);
        await StorageCacheRepository.insertBeatmapset(beatmapset);
      }
      else {
        await StorageCacheRepository.insertEmptyBeatmapset(ctx);
      }
    }
    catch (error) {
      logger.error({ err: error }, "StorageHelper: insertBeatmapset failed");
    }
  }

  static async insertBeatmapsetFile(
    file: ArrayBuffer | null,
    ctx: DownloadBeatmapSetOptions,
  ): Promise<void> {
    try {
      await StorageFilesHelper.insertBeatmapsetFile(file, ctx);
    }
    catch (error) {
      logger.error({ err: error }, "StorageHelper: insertBeatmapsetFile failed");
    }
  }

  static async insertBeatmapOsuFile(
    file: ArrayBuffer | null,
    ctx: DownloadOsuBeatmap,
  ): Promise<void> {
    try {
      await StorageFilesHelper.insertBeatmapOsuFile(file, ctx);
    }
    catch (error) {
      logger.error({ err: error }, "StorageHelper: insertBeatmapOsuFile failed");
    }
  }

  public static async getStorageStatistics() {
    if (!storageStatistics || storageStatistics.expiresAt <= Date.now()) {
      storageStatistics = {
        expiresAt: Date.now() + STORAGE_STATISTICS_TTL_MS,
        value: await readStorageStatistics(),
      };
    }

    return storageStatistics.value;
  }
}

async function readStorageStatistics() {
  return {
    database: {
      beatmaps: await BeatmapRepository.getCount(),
      beatmapSets: await BeatmapsetRepository.getCount(),
      beatmapSetFile: await BeatmapsetFileRepository.getCount(),
      beatmapOsuFile: await BeatmapOsuFileRepository.getCount(),
    },
    files: await StorageFilesHelper.getStorageFilesStats(),
    cache: await StorageCacheRepository.getRedisStats(),
  };
}
