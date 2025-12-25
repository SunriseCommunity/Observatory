import type { Beatmap, Beatmapset } from "../../../types/general/beatmap";
import logger from "../../../utils/logger";
import { BaseClient } from "../../abstracts/client/base-client.abstract";
import type {
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  GetBeatmapsOptions,
  ResultWithStatus,
} from "../../abstracts/client/base-client.types";
import {
  ClientAbilities,
} from "../../abstracts/client/base-client.types";
import { BanchoService } from "./bancho-client.service";
import type { BanchoBeatmap, BanchoBeatmapset } from "./bancho-client.types";

export class BanchoClient extends BaseClient {
  private readonly banchoService = new BanchoService(this.baseApi);

  constructor() {
    super(
      {
        baseUrl: "https://osu.ppy.sh",
        abilities: [
          ClientAbilities.GetBeatmapById,
          ClientAbilities.GetBeatmapSetById,
          ClientAbilities.GetBeatmaps,
          ClientAbilities.DownloadOsuBeatmap,
          ClientAbilities.GetBeatmapsetsByBeatmapIds,
        ],
      },
      {
        rateLimits: [
          {
            abilities: [
              ClientAbilities.GetBeatmapById,
              ClientAbilities.GetBeatmapSetById,
              ClientAbilities.GetBeatmaps,
              ClientAbilities.DownloadOsuBeatmap,
              ClientAbilities.GetBeatmapsetsByBeatmapIds,
            ],
            routes: ["/"],
            limit: 1200,
            reset: 60,
          },
        ],
      },
    );

    logger.info("BanchoClient: initialized");
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ResultWithStatus<Beatmapset>> {
    if (ctx.beatmapSetId) {
      return await this.getBeatmapSetById(ctx.beatmapSetId);
    }

    throw new Error("Invalid arguments");
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<ResultWithStatus<Beatmap>> {
    if (ctx.beatmapId) {
      return await this.getBeatmapById(ctx.beatmapId);
    }

    throw new Error("Invalid arguments");
  }

  async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ResultWithStatus<Beatmap[]>> {
    const { ids } = ctx;

    const result = await this.api.get<{ beatmaps: BanchoBeatmap[] }>(
            `api/v2/beatmaps?${ids.map(id => `ids[]=${id}`).join("&")}`,
            {
              config: {
                headers: {
                  Authorization: `Bearer ${await this.osuApiKey}`,
                },
              },
            },
    );

    if (!result || result.status !== 200) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: result.data?.beatmaps?.map((b: BanchoBeatmap) =>
        this.convertService.convertBeatmap(b),
      ),
      status: result.status,
    };
  }

  async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const { beatmapIds } = ctx;

    const result = await this.api.get<{ beatmaps: BanchoBeatmap[] }>(
            `api/v2/beatmaps?${beatmapIds.map(id => `ids[]=${id}`).join("&")}`,
            {
              config: {
                headers: {
                  Authorization: `Bearer ${await this.osuApiKey}`,
                },
              },
            },
    );

    if (!result || result.status !== 200) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: result.data?.beatmaps?.map((b: BanchoBeatmap) =>
        this.convertService.convertBeatmapset({
          ...b.beatmapset,
          ...(b.convert
            ? { converts: [b.convert] }
            : { beatmaps: [b] }),
        } as BanchoBeatmapset),
      ),
      status: result.status,
    };
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
    else if (result.data.byteLength === 0) {
      return { result: null, status: 404 };
    }

    return { result: result.data, status: result.status };
  }

  private async getBeatmapSetById(
    beatmapSetId: number,
  ): Promise<ResultWithStatus<Beatmapset>> {
    const result = await this.api.get<BanchoBeatmapset>(
            `api/v2/beatmapsets/${beatmapSetId}`,
            {
              config: {
                headers: {
                  Authorization: `Bearer ${await this.osuApiKey}`,
                },
              },
            },
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
    const result = await this.api.get<BanchoBeatmap>(
            `api/v2/beatmaps/${beatmapId}`,
            {
              config: {
                headers: {
                  Authorization: `Bearer ${await this.osuApiKey}`,
                },
              },
            },
    );

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: this.convertService.convertBeatmap(result.data),
      status: result.status,
    };
  }

  private get osuApiKey() {
    return this.banchoService.getBanchoClientToken();
  }
}
