import config from "@observatory/common/config";
import type { Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  ResultWithStatus,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";

import { convertMinoBeatmap, convertMinoBeatmapset } from "../../helper/convert.helper";
import type { BeatmapWithSet } from "../../model/mirrors.model";
import { BaseClient, DOWNLOAD_TIMEOUT_MS } from "../base-client.abstract";
import { ClientAbilities } from "../base-client.types";
import type { MinoBeatmap, MinoBeatmapset } from "./mino-client.types";

export class MinoClient extends BaseClient {
  constructor() {
    super(
      {
        baseUrl: config.UseUsCatboyServerOnly ? "https://us.catboy.best" : "https://catboy.best",
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
    );
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const result = await this.api.get<ArrayBuffer>(
      `d/${ctx.beatmapSetId}${ctx.noVideo ? "n" : ""}`,
      {
        config: {
          responseType: "arraybuffer",
          timeout: DOWNLOAD_TIMEOUT_MS,
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
    if (!ctx.beatmapSetId) {
      throw new Error("Invalid arguments");
    }

    const result = await this.api.get<MinoBeatmapset>(`api/v2/s/${ctx.beatmapSetId}`);

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: convertMinoBeatmapset(result.data),
      status: result.status,
    };
  }

  async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const result = await this.api.get<MinoBeatmapset[]>(`api/v2/search`, {
      config: {
        params: {
          query: ctx.query,
          limit: ctx.limit,
          offset: ctx.offset,
          status: ctx.status,
          mode: ctx.mode,
        },
        paramsSerializer: { indexes: null },
      },
    });

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: result.data.map(convertMinoBeatmapset),
      status: result.status,
    };
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<BeatmapWithSet> {
    if (ctx.beatmapId) {
      return await this.getBeatmapFrom(`api/v2/b/${ctx.beatmapId}`);
    }
    else if (ctx.beatmapHash) {
      return await this.getBeatmapFrom(`api/v2/md5/${ctx.beatmapHash}`);
    }

    throw new Error("Invalid arguments");
  }

  private async getBeatmapFrom(
    endpoint: string,
  ): Promise<BeatmapWithSet> {
    const result = await this.api.get<MinoBeatmap>(endpoint);

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    const beatmapset = result.data.set ? convertMinoBeatmapset(result.data.set) : undefined;

    return {
      result: convertMinoBeatmap(result.data),
      status: result.status,
      beatmapset,
    };
  }
}
