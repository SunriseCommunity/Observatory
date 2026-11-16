import type { DownloadOsuBeatmap, ResultWithStatus } from "@observatory/common/types/beatmap-query";
import { MirrorsHelper } from "@observatory/mirrors";
import { StorageHelper } from "@observatory/storage";
import { HttpStatusCode } from "axios";

import type { ServerResponse } from "../model/beatmaps.model";

const INTERNAL_ERROR_RESPONSE = {
  data: null,
  status: HttpStatusCode.InternalServerError,
  message:
        "An unexpected error occurred. Please check the status code for more details and try again later. >.<",
  source: null,
};

export function formatResultAsServerError<T>(result: ResultWithStatus<T>) {
  return { ...INTERNAL_ERROR_RESPONSE, status: result.status };
}

export abstract class BeatmapsHelper {
  static async downloadOsuBeatmap(
    ctx: DownloadOsuBeatmap,
  ): Promise<ServerResponse<null | ArrayBuffer>> {
    const beatmapOsuFile = await StorageHelper.getOsuBeatmapFile(ctx);

    if (beatmapOsuFile) {
      return {
        data: beatmapOsuFile,
        status: HttpStatusCode.Ok,
        source: "storage",
      };
    }
    else if (beatmapOsuFile === null) {
      return {
        data: null,
        status: HttpStatusCode.NotFound,
        message: "Osu file not found",
        source: "storage",
      };
    }

    const result = await MirrorsHelper.downloadOsuBeatmap(ctx);

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    StorageHelper.insertBeatmapOsuFile(result.result, ctx);

    if (result.status >= 400 || !result.result) {
      return {
        data: null,
        status: HttpStatusCode.NotFound,
        message: "Osu file not found",
        source: null,
      };
    }

    return {
      data: result.result,
      status: result.status,
      source: "mirror",
    };
  }

  public static async getManagerStats(shouldIncludeMirrorStats = true) {
    return {
      storage: await StorageHelper.getStorageStatistics(),
      mirrors: shouldIncludeMirrorStats ? await MirrorsHelper.getMirrorsStatistics() : undefined,
    };
  }
}
