import logger from "@observatory/common/observability/logger";
import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  GetBeatmapsOptions,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";
import { MirrorsPublic } from "@observatory/mirrors";
import { StoragePublic } from "@observatory/storage";
import { HttpStatusCode } from "axios";

import { BeatmapsHelper, formatResultAsServerError } from "../helper/beatmaps.helper";
import type { ServerResponse } from "../model/beatmaps.model";

export abstract class BeatmapsService {
  static async getBeatmap(ctx: GetBeatmapOptions): Promise<ServerResponse<Beatmap>> {
    const beatmap = await StoragePublic.getBeatmap(ctx);
    if (beatmap || beatmap === null) {
      return {
        data: beatmap,
        status: beatmap ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
        message: !beatmap ? "Beatmap not found" : undefined,
        source: "storage",
      };
    }

    const result = await MirrorsPublic.getBeatmap(ctx);

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    // Allow caching partial mirror responses with placeholder fields for now.
    StoragePublic.insertBeatmap(result.result, ctx);
    if (result.beatmapset) {
      StoragePublic.insertBeatmapset(result.beatmapset, { beatmapSetId: result.beatmapset.id });
    }

    return {
      data: result.result,
      status: result.status,
      message: result.status === 404 ? "Beatmap not found" : undefined,
      source: "mirror",
    };
  }

  static async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ServerResponse<Beatmapset>> {
    const beatmapset = await StoragePublic.getBeatmapSet(ctx);
    if (beatmapset || beatmapset === null) {
      return {
        data: beatmapset,
        status: beatmapset
          ? HttpStatusCode.Ok
          : HttpStatusCode.NotFound,
        message: !beatmapset ? "Beatmapset not found" : undefined,
        source: "storage",
      };
    }

    const result = await MirrorsPublic.getBeatmapSet(ctx);

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    StoragePublic.insertBeatmapset(result.result, ctx);

    return {
      data: result.result,
      status: result.status,
      message: result.status === 404 ? "Beatmapset not found" : undefined,
      source: "mirror",
    };
  }

  static async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ServerResponse<Beatmapset[]>> {
    const searchResult = await StoragePublic.getSearchResult(ctx);

    if (searchResult) {
      return {
        data: searchResult,
        status: HttpStatusCode.Ok,
        message: undefined,
        source: "storage",
      };
    }

    const result = await MirrorsPublic.searchBeatmapsets(ctx);

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    if (result.result && result.status === 200) {
      StoragePublic.insertSearchResult(ctx, result.result);
    }

    return {
      data: result.result,
      status: result.status,
      message:
                result.status === 404 ? "Beatmapsets not found" : undefined,
      source: "mirror",
    };
  }

  static async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ServerResponse<Beatmap[]>> {
    const result = await MirrorsPublic.getBeatmaps(ctx);

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    if (result.result && result.result.length > 0) {
      for (const beatmap of result.result) {
        StoragePublic.insertBeatmap(beatmap, {
          beatmapId: beatmap.id,
        });
      }
    }

    return {
      data: result.result,
      status: result.status,
      message: result.status === 404 ? "Beatmaps not found" : undefined,
      source: "mirror",
    };
  }

  static async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ServerResponse<Beatmapset[]>> {
    const beatmapsets
      = await StoragePublic.getBeatmapSetsByBeatmapIds(ctx);

    const storedIds = new Set(
      beatmapsets.flatMap(set => [
        ...(set.beatmaps?.map(map => map.id) ?? []),
        ...(set.converts?.map(map => map.id) ?? []),
      ]),
    );
    const missingIds = ctx.beatmapIds.filter(id => !storedIds.has(id));

    if (missingIds.length === 0) {
      return {
        data: beatmapsets,
        status: HttpStatusCode.Ok,
        message: undefined,
        source: "storage",
      };
    }

    const result = await MirrorsPublic.getBeatmapsetsByBeatmapIds({
      beatmapIds: missingIds,
    });

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    // ! NOTE: Results from getBeatmapsetsByBeatmapIds hold one partial beatmapset per requested beatmap, so fetch each missing set once in full
    const missingSetIds = new Set(
      result.result
        ?.map(beatmapset => beatmapset.id)
        .filter(id => !beatmapsets.some(set => set.id === id)),
    );

    const setIds = [...missingSetIds];
    const fetched = await Promise.all(setIds.map(beatmapSetId => BeatmapsService.getBeatmapSet({ beatmapSetId })));
    const failed = fetched.find(response => response.status >= 500);
    if (failed) {
      return formatResultAsServerError({ result: null, status: failed.status });
    }

    const sets = [...beatmapsets, ...fetched.flatMap(response => response.data ?? [])];
    const returnedIds = new Set(sets.flatMap(set => [
      ...(set.beatmaps?.map(map => map.id) ?? []),
      ...(set.converts?.map(map => map.id) ?? []),
    ]));
    const missingBeatmapIds = ctx.beatmapIds.filter(id => !returnedIds.has(id));
    const missingBeatmapsetIds = setIds.filter((_, index) => !fetched[index].data);
    const messages = [
      missingBeatmapIds.length ? `Some beatmaps not found: ${missingBeatmapIds.join(", ")}` : undefined,
      missingBeatmapsetIds.length ? `Some beatmapsets could not be fetched: ${missingBeatmapsetIds.join(", ")}` : undefined,
    ].filter(message => message !== undefined);

    if (messages.length) {
      logger.warn({ missingBeatmapIds, missingBeatmapsetIds }, "Beatmapset lookup returned incomplete results");
    }

    return {
      data: sets,
      status: result.status,
      message: messages.length ? messages.join("; ") : undefined,
      source: "mirror",
    };
  }

  static async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ServerResponse<null | ArrayBuffer>> {
    const beatmapsetFile = await StoragePublic.getBeatmapsetFile(ctx);

    if (beatmapsetFile) {
      return {
        data: beatmapsetFile,
        status: HttpStatusCode.Ok,
        source: "storage",
      };
    }
    else if (beatmapsetFile === null) {
      return {
        data: null,
        status: HttpStatusCode.NotFound,
        message: "Beatmapset not found",
        source: null,
      };
    }

    const result = await MirrorsPublic.downloadBeatmapSet(ctx);

    if (result.status >= 500) {
      return formatResultAsServerError(result);
    }

    StoragePublic.insertBeatmapsetFile(result.result, ctx);

    if (result.status >= 400 || !result.result) {
      return {
        data: null,
        status: HttpStatusCode.NotFound,
        message: "Beatmapset not found",
        source: null,
      };
    }

    return {
      data: result.result,
      status: result.status,
      source: "mirror",
    };
  }

  static downloadOsuBeatmap(ctx: DownloadOsuBeatmap) {
    return BeatmapsHelper.downloadOsuBeatmap(ctx);
  }
}
