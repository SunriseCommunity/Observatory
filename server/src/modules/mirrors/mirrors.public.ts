import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  GetBeatmapsOptions,
  ResultWithStatus,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";

import { MirrorsHelper } from "./helper/mirrors.helper";
import type { BeatmapWithSet } from "./model/mirrors.model";

export type { BeatmapWithSet } from "./model/mirrors.model";

export abstract class MirrorsPublic {
  static getBeatmap(ctx: GetBeatmapOptions): Promise<BeatmapWithSet> {
    return MirrorsHelper.getBeatmap(ctx);
  }

  static getBeatmapSet(ctx: GetBeatmapSetOptions): Promise<ResultWithStatus<Beatmapset>> {
    return MirrorsHelper.getBeatmapSet(ctx);
  }

  static searchBeatmapsets(ctx: SearchBeatmapsetsOptions): Promise<ResultWithStatus<Beatmapset[]>> {
    return MirrorsHelper.searchBeatmapsets(ctx);
  }

  static getBeatmaps(ctx: GetBeatmapsOptions): Promise<ResultWithStatus<Beatmap[]>> {
    return MirrorsHelper.getBeatmaps(ctx);
  }

  static getBeatmapsetsByBeatmapIds(ctx: GetBeatmapsetsByBeatmapIdsOptions): Promise<ResultWithStatus<Beatmapset[]>> {
    return MirrorsHelper.getBeatmapsetsByBeatmapIds(ctx);
  }

  static downloadBeatmapSet(ctx: DownloadBeatmapSetOptions): Promise<ResultWithStatus<ArrayBuffer>> {
    return MirrorsHelper.downloadBeatmapSet(ctx);
  }

  static downloadOsuBeatmap(ctx: DownloadOsuBeatmap): Promise<ResultWithStatus<ArrayBuffer>> {
    return MirrorsHelper.downloadOsuBeatmap(ctx);
  }

  static getMirrorsStatistics(): ReturnType<typeof MirrorsHelper.getMirrorsStatistics> {
    return MirrorsHelper.getMirrorsStatistics();
  }
}
