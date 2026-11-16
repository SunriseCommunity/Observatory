import type { Beatmap } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  ResultWithStatus,
} from "@observatory/common/types/beatmap-query";

import { convertDirectBeatmap } from "../../helper/convert.helper";
import { BaseClient, DOWNLOAD_TIMEOUT_MS } from "../base-client.abstract";
import { ClientAbilities } from "../base-client.types";
import type { DirectBeatmap } from "./direct-client.types";

export class DirectClient extends BaseClient {
  constructor() {
    super(
      {
        baseUrl: "https://osu.direct/api",
        abilities: [
          ClientAbilities.DownloadBeatmapSetById,
          ClientAbilities.DownloadBeatmapSetByIdNoVideo,
          ClientAbilities.DownloadOsuBeatmap,
          ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues,
          ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues,
        ],
      },
      {
        headers: {
          remaining: "ratelimit-remaining",
          reset: "ratelimit-reset",
          limit: "ratelimit-limit",
        },
        rateLimits: [
          {
            abilities: [
              ClientAbilities.DownloadBeatmapSetById,
              ClientAbilities.DownloadBeatmapSetByIdNoVideo,
              ClientAbilities.DownloadOsuBeatmap,
              ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues,
              ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues,
            ],
            routes: ["/"],
            limit: 50,
            reset: 60,
          },
        ],
      },
    );
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<ResultWithStatus<Beatmap>> {
    if (ctx.beatmapId) {
      return await this.getBeatmapFrom(`v2/b/${ctx.beatmapId}`);
    }
    if (ctx.beatmapHash) {
      return await this.getBeatmapFrom(`v2/md5/${ctx.beatmapHash}`);
    }

    throw new Error("Invalid arguments");
  }

  private async getBeatmapFrom(
    endpoint: string,
  ): Promise<ResultWithStatus<Beatmap>> {
    const result = await this.api.get<DirectBeatmap>(endpoint);

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: convertDirectBeatmap(result.data),
      status: result.status,
    };
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const result = await this.api.get<ArrayBuffer>(
      `d/${ctx.beatmapSetId}`,
      {
        config: {
          responseType: "arraybuffer",
          timeout: DOWNLOAD_TIMEOUT_MS,
          params: {
            noVideo: ctx.noVideo ? true : undefined,
          },
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
}
