import logger from "@observatory/common/observability/logger";
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
import type { MirrorsService } from "@observatory/mirrors";
import type { StorageService } from "@observatory/storage";
import { HttpStatusCode } from "axios";

import type { ServerResponse } from "../model/beatmaps.model";

const INTERNAL_ERROR_RESPONSE = {
  data: null,
  status: HttpStatusCode.InternalServerError,
  message:
        "An unexpected error occurred. Please check the status code for more details and try again later. >.<",
  source: null,
};

export class BeatmapsService {
  constructor(
    private readonly storageService: StorageService,
    private readonly mirrorsService: MirrorsService,
  ) {}

  async getBeatmap(ctx: GetBeatmapOptions): Promise<ServerResponse<Beatmap>> {
    const beatmap = await this.storageService.getBeatmap(ctx);
    if (beatmap || beatmap === null) {
      return {
        data: beatmap,
        status: beatmap ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
        message: !beatmap ? "Beatmap not found" : undefined,
        source: "storage",
      };
    }

    const result = await this.mirrorsService.getBeatmap(ctx);

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    // Allow caching partial mirror responses with placeholder fields for now.
    this.storageService.insertBeatmap(result.result, ctx);

    return {
      data: result.result,
      status: result.status,
      message: result.status === 404 ? "Beatmap not found" : undefined,
      source: "mirror",
    };
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ServerResponse<Beatmapset>> {
    const beatmapset = await this.storageService.getBeatmapSet(ctx);
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

    const result = await this.mirrorsService.getBeatmapSet(ctx);

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    this.storageService.insertBeatmapset(result.result, ctx);

    return {
      data: result.result,
      status: result.status,
      message: result.status === 404 ? "Beatmapset not found" : undefined,
      source: "mirror",
    };
  }

  async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ServerResponse<Beatmapset[]>> {
    const searchResult = await this.storageService.getSearchResult(ctx);

    if (searchResult) {
      return {
        data: searchResult,
        status: HttpStatusCode.Ok,
        message: undefined,
        source: "storage",
      };
    }

    const result = await this.mirrorsService.searchBeatmapsets(ctx);

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    if (result.result && result.status === 200) {
      this.storageService.insertSearchResult(ctx, result.result);
    }

    return {
      data: result.result,
      status: result.status,
      message:
                result.status === 404 ? "Beatmapsets not found" : undefined,
      source: "mirror",
    };
  }

  async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ServerResponse<Beatmap[]>> {
    const result = await this.mirrorsService.getBeatmaps(ctx);

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    if (result.result && result.result.length > 0) {
      for (const beatmap of result.result) {
        this.storageService.insertBeatmap(beatmap, {
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

  async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ServerResponse<Beatmapset[]>> {
    const beatmapsets
      = await this.storageService.getBeatmapSetsByBeatmapIds(ctx);

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

    const result = await this.mirrorsService.getBeatmapsetsByBeatmapIds({
      beatmapIds: missingIds,
    });

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    // ! NOTE: Results from getBeatmapsetsByBeatmapIds hold one partial beatmapset per requested beatmap, so fetch each missing set once in full
    const missingSetIds = new Set(
      result.result
        ?.map(beatmapset => beatmapset.id)
        .filter(id => !beatmapsets.some(set => set.id === id)),
    );

    const setIds = [...missingSetIds];
    const fetched = await Promise.all(setIds.map(beatmapSetId => this.getBeatmapSet({ beatmapSetId })));
    const failed = fetched.find(response => response.status >= 500);
    if (failed) {
      return this.formatResultAsServerError({ result: null, status: failed.status });
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

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ServerResponse<null | ArrayBuffer>> {
    const beatmapsetFile = await this.storageService.getBeatmapsetFile(ctx);

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

    const result = await this.mirrorsService.downloadBeatmapSet(ctx);

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    this.storageService.insertBeatmapsetFile(result.result, ctx);

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

  async downloadOsuBeatmap(
    ctx: DownloadOsuBeatmap,
  ): Promise<ServerResponse<null | ArrayBuffer>> {
    const beatmapOsuFile = await this.storageService.getOsuBeatmapFile(ctx);

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

    const result = await this.mirrorsService.downloadOsuBeatmap(ctx);

    if (result.status >= 500) {
      return this.formatResultAsServerError(result);
    }

    this.storageService.insertBeatmapOsuFile(result.result, ctx);

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

  public async getManagerStats(shouldIncludeMirrorStats = true) {
    return {
      storage: await this.storageService.getStorageStatistics(),
      mirrors: shouldIncludeMirrorStats ? await this.mirrorsService.getMirrorsStatistics() : undefined,
    };
  }

  private formatResultAsServerError<T>(result: ResultWithStatus<T>) {
    return { ...INTERNAL_ERROR_RESPONSE, status: result.status };
  }
}
