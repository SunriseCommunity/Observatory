import qs from "qs";

import { BEATMAPS_SEARCH_MAX_RESULTS_LIMIT } from "../../../types/general/api";
import type { Beatmap, Beatmapset } from "../../../types/general/beatmap";
import { RankStatus, RankStatusInt } from "../../../types/general/rankStatus";
import logger from "../../../utils/logger";
import { BaseClient } from "../../abstracts/client/base-client.abstract";
import type {
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  GetBeatmapsOptions,
  ResultWithStatus,
  SearchBeatmapsetsOptions,
} from "../../abstracts/client/base-client.types";
import {
  ClientAbilities,
} from "../../abstracts/client/base-client.types";
import { BanchoService } from "./bancho-client.service";
import type { BanchoBeatmap, BanchoBeatmapset, BanchoBeatmapsetSearchResult } from "./bancho-client.types";

const BANCHO_SEARCH_PAGE_SIZE = 50;
const BANCHO_SEARCH_PAGES_LIMIT = 200;

export class BanchoClient extends BaseClient {
  private readonly banchoService = new BanchoService(this.baseApi);

  constructor() {
    super(
      {
        baseUrl: "https://osu.ppy.sh",
        abilities: [
          ClientAbilities.GetBeatmapById,
          ClientAbilities.GetBeatmapByHash,
          ClientAbilities.GetBeatmapByFilename,
          ClientAbilities.GetBeatmapSetById,
          ClientAbilities.GetBeatmaps,
          ClientAbilities.DownloadOsuBeatmap,
          ClientAbilities.GetBeatmapsetsByBeatmapIds,
          ClientAbilities.SearchBeatmapsets,
        ],
      },
      {
        headers: {
          remaining: "x-ratelimit-remaining",
          limit: "x-ratelimit-limit",
        },
        rateLimits: [
          {
            abilities: [
              ClientAbilities.GetBeatmapById,
              ClientAbilities.GetBeatmapByHash,
              ClientAbilities.GetBeatmapByFilename,
              ClientAbilities.GetBeatmapSetById,
              ClientAbilities.GetBeatmaps,
              ClientAbilities.DownloadOsuBeatmap,
              ClientAbilities.GetBeatmapsetsByBeatmapIds,
              ClientAbilities.SearchBeatmapsets,
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
    else if (ctx.beatmapHash) {
      return await this.getBeatmapByHash(ctx.beatmapHash);
    }
    else if (ctx.beatmapFilename) {
      return await this.getBeatmapByFilename(ctx.beatmapFilename);
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

  async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const page = Math.floor((ctx.offset ?? 0) / BANCHO_SEARCH_PAGE_SIZE) + 1;

    if (page > BANCHO_SEARCH_PAGES_LIMIT
      || (ctx.limit && ctx.limit > BANCHO_SEARCH_PAGE_SIZE && page === BANCHO_SEARCH_PAGES_LIMIT)) {
      return { result: null, status: 500 }; // Bancho API has a limit of 200 pages
    }

    const result = await this.api.get<BanchoBeatmapsetSearchResult>(`api/v2/beatmapsets/search`, {
      config: {
        headers: {
          Authorization: `Bearer ${await this.osuApiKey}`,
        },
        params: {
          q: ctx.query,
          page,
          s: ctx.status ? ctx.status.map(status => this.mapStatusToRankStatus(status).toString()) : undefined,
          m: ctx.mode,
          nsfw: true, // TODO: Maybe make this configurable?
        },
        paramsSerializer: params =>
          qs.stringify(params, { indices: false }),
      },
    });

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    let { beatmapsets } = result.data;
    let additionalBeatmapsets: BanchoBeatmapset[] = [];

    if (ctx.limit && ctx.limit <= BEATMAPS_SEARCH_MAX_RESULTS_LIMIT) {
      if (ctx.limit < BANCHO_SEARCH_PAGE_SIZE) {
        beatmapsets = beatmapsets.slice(0, ctx.limit);
      }

      if (ctx.limit > BANCHO_SEARCH_PAGE_SIZE && page < BANCHO_SEARCH_PAGES_LIMIT) {
        additionalBeatmapsets = await this.searchBeatmapsets({
          ...ctx,
          limit: ctx.limit - beatmapsets.length,
          offset: (ctx.offset ?? 0) + beatmapsets.length,
        }).then(result => result.result ?? []);
      }
    }

    return {
      result: [...additionalBeatmapsets, ...(beatmapsets.map((b: BanchoBeatmapset) =>
        this.convertService.convertBeatmapset(b),
      ))],
      status: result.status,
    };
  }

  private mapStatusToRankStatus(status: RankStatusInt): RankStatus {
    switch (status) {
      case RankStatusInt.PENDING:
        return RankStatus.PENDING;
      case RankStatusInt.QUALIFIED:
        return RankStatus.QUALIFIED;
      case RankStatusInt.LOVED:
        return RankStatus.LOVED;
      case RankStatusInt.GRAVEYARD:
        return RankStatus.GRAVEYARD;
      case RankStatusInt.WIP:
        return RankStatus.WIP;
      case RankStatusInt.APPROVED:
        return RankStatus.APPROVED;
    }

    return RankStatus.PENDING;
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

  private async getBeatmapByHash(
    beatmapHash: string,
  ): Promise<ResultWithStatus<Beatmap>> {
    const result = await this.api.get<BanchoBeatmap>(`api/v2/beatmaps/lookup?checksum=${beatmapHash}`, {
      config: {
        headers: {
          Authorization: `Bearer ${await this.osuApiKey}`,
        },
      },
    });

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: this.convertService.convertBeatmap(result.data),
      status: result.status,
    };
  }

  private async getBeatmapByFilename(
    beatmapHash: string,
  ): Promise<ResultWithStatus<Beatmap>> {
    const result = await this.api.get<BanchoBeatmap>(`api/v2/beatmaps/lookup`, {
      config: {
        headers: {
          Authorization: `Bearer ${await this.osuApiKey}`,
        },
        params: {
          filename: beatmapHash,
        },
      },
    });

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
