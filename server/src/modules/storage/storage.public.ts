import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";

import { StorageHelper } from "./helper/storage.helper";

export abstract class StoragePublic {
  static getBeatmap(ctx: GetBeatmapOptions): Promise<Beatmap | null | undefined> {
    return StorageHelper.getBeatmap(ctx);
  }

  static getBeatmapSet(ctx: GetBeatmapSetOptions): Promise<Beatmapset | null | undefined> {
    return StorageHelper.getBeatmapSet(ctx);
  }

  static getBeatmapSetsByBeatmapIds(ctx: GetBeatmapsetsByBeatmapIdsOptions): Promise<Beatmapset[]> {
    return StorageHelper.getBeatmapSetsByBeatmapIds(ctx);
  }

  static getBeatmapsetFile(ctx: DownloadBeatmapSetOptions): Promise<ArrayBuffer | null | undefined> {
    return StorageHelper.getBeatmapsetFile(ctx);
  }

  static getSearchResult(ctx: SearchBeatmapsetsOptions): Promise<Beatmapset[] | undefined> {
    return StorageHelper.getSearchResult(ctx);
  }

  static insertSearchResult(ctx: SearchBeatmapsetsOptions, result: Beatmapset[]): Promise<void> {
    return StorageHelper.insertSearchResult(ctx, result);
  }

  static getOsuBeatmapFile(ctx: DownloadOsuBeatmap): Promise<ArrayBuffer | null | undefined> {
    return StorageHelper.getOsuBeatmapFile(ctx);
  }

  static insertBeatmap(beatmap: Beatmap | null, ctx: GetBeatmapOptions): Promise<void> {
    return StorageHelper.insertBeatmap(beatmap, ctx);
  }

  static insertBeatmapset(beatmapset: Beatmapset | null, ctx: GetBeatmapSetOptions): Promise<void> {
    return StorageHelper.insertBeatmapset(beatmapset, ctx);
  }

  static insertBeatmapsetFile(file: ArrayBuffer | null, ctx: DownloadBeatmapSetOptions): Promise<void> {
    return StorageHelper.insertBeatmapsetFile(file, ctx);
  }

  static insertBeatmapOsuFile(file: ArrayBuffer | null, ctx: DownloadOsuBeatmap): Promise<void> {
    return StorageHelper.insertBeatmapOsuFile(file, ctx);
  }

  static getStorageStatistics(): ReturnType<typeof StorageHelper.getStorageStatistics> {
    return StorageHelper.getStorageStatistics();
  }
}
