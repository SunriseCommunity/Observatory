import qs from "qs";

import type { Beatmap, Beatmapset } from "../../../types/general/beatmap";
import logger from "../../../utils/logger";
import { BaseClient } from "../../abstracts/client/base-client.abstract";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  ResultWithStatus,
  SearchBeatmapsetsOptions,
} from "../../abstracts/client/base-client.types";
import {
  ClientAbilities,
} from "../../abstracts/client/base-client.types";
import type { StorageManager } from "../../managers/storage/storage.manager";
import type { MinoBeatmap, MinoBeatmapset } from "./mino-client.types";

export class MinoClient extends BaseClient {
  constructor(storageManager: StorageManager) {
    super(
      {
        baseUrl: "https://catboy.best",
        abilities: [
          ClientAbilities.GetBeatmapById,
          ClientAbilities.GetBeatmapSetById,
          ClientAbilities.GetBeatmapByHash,
          ClientAbilities.DownloadBeatmapSetByIdNoVideo,
          ClientAbilities.DownloadBeatmapSetById,
          ClientAbilities.SearchBeatmapsets,
          ClientAbilities.DownloadOsuBeatmap,
        ],
      },
      {
        dailyRateLimits: [
          { limit: 10000 },
          {
            limit: 2000,
            // Mino has nested daily rate limits for downloads
            abilities: [
              ClientAbilities.DownloadBeatmapSetById,
              ClientAbilities.DownloadBeatmapSetByIdNoVideo,
              ClientAbilities.DownloadOsuBeatmap,
            ],
          },
        ],
        headers: {
          remaining: "x-ratelimit-remaining",
        },
        rateLimits: [
          {
            abilities: [
              ClientAbilities.DownloadBeatmapSetByIdNoVideo,
              ClientAbilities.DownloadBeatmapSetById,
            ],
            routes: ["d/"],
            limit: 120,
            reset: 60,
          },
          {
            abilities: [ClientAbilities.DownloadOsuBeatmap],
            routes: ["osu/"],
            limit: 120,
            reset: 60,
          },
          {
            abilities: [ClientAbilities.SearchBeatmapsets],
            routes: ["api/v2/search"],
            limit: 500,
            reset: 60,
          },
          {
            abilities: [
              ClientAbilities.GetBeatmapById,
              ClientAbilities.GetBeatmapByHash,
              ClientAbilities.GetBeatmapSetById,
            ],
            routes: [
              "api/v2/s/",
              "api/v2/b/",
              "api/v2/md5/",
              "api/v2/beatmaps",
              "api/v2/beatmapsets",
            ],
            limit: 500,
            reset: 60,
          },
        ],
      },
      storageManager,
    );

    logger.info("MinoClient initialized");
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const result = await this.api.get<ArrayBuffer>(
            `d/${ctx.beatmapSetId}${ctx.noVideo ? "n" : ""}`,
            {
              config: {
                responseType: "arraybuffer",
              },
            },
    );

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return { result: result.data, status: result.status };
  }

  async downloadOsuBeatmap(
    ctx: DownloadOsuBeatmap,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const result = await this.api.get<ArrayBuffer>(`osu/${ctx.beatmapId}`, {
      config: {
        responseType: "arraybuffer",
      },
    });

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return { result: result.data, status: result.status };
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ResultWithStatus<Beatmapset>> {
    if (ctx.beatmapSetId) {
      return await this.getBeatmapSetById(ctx.beatmapSetId);
    }

    throw new Error("Invalid arguments");
  }

  async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const result = await this.api.get<Beatmapset[]>(`api/v2/search`, {
      config: {
        params: {
          query: ctx.query,
          limit: ctx.limit,
          offset: ctx.offset,
          status: ctx.status,
          mode: ctx.mode,
        },
        paramsSerializer: params =>
          qs.stringify(params, { indices: false }),
      },
    });

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: result.data.map((b: MinoBeatmapset) =>
        this.convertService.convertBeatmapset(b),
      ),
      status: result.status,
    };
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<ResultWithStatus<Beatmap>> {
    if (ctx.beatmapId) {
      return await this.getBeatmapById(ctx.beatmapId);
    }
    else if (ctx.beatmapHash) {
      return await this.getBeatmapByHash(ctx.beatmapHash);
    }

    throw new Error("Invalid arguments");
  }

  private async getBeatmapSetById(
    beatmapSetId: number,
  ): Promise<ResultWithStatus<Beatmapset>> {
    const result = await this.api.get<Beatmapset>(
            `api/v2/s/${beatmapSetId}`,
    );

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: this.convertService.convertBeatmapset(result.data),
      status: result.status,
    };
  }

  private async getBeatmapById(
    beatmapId: number,
  ): Promise<ResultWithStatus<Beatmap>> {
    const result = await this.api.get<Beatmap>(`api/v2/b/${beatmapId}`);

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    const beatmap = result.data as MinoBeatmap;
    if (beatmap.set) {
      const beatmapSet = this.convertService.convertBeatmapset(beatmap.set);
      await this.storageManager?.insertBeatmapset(beatmapSet, {
        beatmapSetId: beatmapSet.id,
      });
    }

    return {
      result: this.convertService.convertBeatmap(result.data),
      status: result.status,
    };
  }

  private async getBeatmapByHash(
    beatmapHash: string,
  ): Promise<ResultWithStatus<Beatmap>> {
    const result = await this.api.get<Beatmap>(`api/v2/md5/${beatmapHash}`);

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    const beatmap = result.data as MinoBeatmap;
    if (beatmap.set) {
      const beatmapSet = this.convertService.convertBeatmapset(beatmap.set);
      await this.storageManager?.insertBeatmapset(beatmapSet, {
        beatmapSetId: beatmapSet.id,
      });
    }

    return {
      result: this.convertService.convertBeatmap(result.data),
      status: result.status,
    };
  }
}
