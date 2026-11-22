import type { DownloadOsuBeatmap } from "@observatory/common/types/beatmap-query";

import { BeatmapsHelper } from "./helper/beatmaps.helper";
import type { ServerResponse } from "./model/beatmaps.model";

export abstract class BeatmapsPublic {
  static downloadOsuBeatmap(ctx: DownloadOsuBeatmap): Promise<ServerResponse<null | ArrayBuffer>> {
    return BeatmapsHelper.downloadOsuBeatmap(ctx);
  }

  static getManagerStats(shouldIncludeMirrorStats?: boolean): ReturnType<typeof BeatmapsHelper.getManagerStats> {
    return BeatmapsHelper.getManagerStats(shouldIncludeMirrorStats);
  }
}
