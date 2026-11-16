import { BEATMAPS_SEARCH_MAX_RESULTS_LIMIT } from "@observatory/common/types/api";
import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  GetBeatmapsetsByBeatmapIdsOptions,
  GetBeatmapsOptions,
  ResultWithStatus,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";
import { RankStatus, RankStatusInt } from "@observatory/common/types/rankStatus";
import type { AxiosRequestConfig } from "axios";

import { convertBanchoBeatmap, convertBanchoBeatmapset } from "../../helper/convert.helper";
import { BaseClient } from "../base-client.abstract";
import { ClientAbilities } from "../base-client.types";
import { BanchoService } from "./bancho-client.service";
import type { BanchoBeatmap, BanchoBeatmapset, BanchoBeatmapsetSearchResult } from "./bancho-client.types";

const BANCHO_SEARCH_PAGE_SIZE = 50;
const BANCHO_SEARCH_PAGES_LIMIT = 200;

// TODO: This is expected behaviour of catboy, so sunrise just went with it, but maybe we should consider adding a separate parameter for sorting instead of overloading the query parameter?
const SORT_QUERIES = new Map<string, string | undefined>([
  ["Newest", undefined], // Default one
  ["Top Rated", "rating_desc"],
  ["Most Played", "plays_desc"],
]);

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
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ResultWithStatus<Beatmapset>> {
    if (!ctx.beatmapSetId) {
      throw new Error("Invalid arguments");
    }

    const result = await this.authorizedGet<BanchoBeatmapset>(
      `api/v2/beatmapsets/${ctx.beatmapSetId}`,
    );

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: convertBanchoBeatmapset(result.data),
      status: result.status,
    };
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<ResultWithStatus<Beatmap>> {
    if (ctx.beatmapId) {
      return await this.getBeatmapFrom(`api/v2/beatmaps/${ctx.beatmapId}`);
    }
    if (ctx.beatmapHash) {
      return await this.getBeatmapFrom(`api/v2/beatmaps/lookup?checksum=${ctx.beatmapHash}`);
    }
    if (ctx.beatmapFilename) {
      return await this.getBeatmapFrom(`api/v2/beatmaps/lookup`, {
        params: {
          filename: ctx.beatmapFilename,
        },
      });
    }

    throw new Error("Invalid arguments");
  }

  private async getBeatmapFrom(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<ResultWithStatus<Beatmap>> {
    const result = await this.authorizedGet<BanchoBeatmap>(endpoint, config);

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: convertBanchoBeatmap(result.data),
      status: result.status,
    };
  }

  async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ResultWithStatus<Beatmap[]>> {
    const result = await this.authorizedGet<{ beatmaps: BanchoBeatmap[] }>(
      `api/v2/beatmaps?${ctx.ids.map(id => `ids[]=${id}`).join("&")}`,
    );

    if (!result || result.status !== 200) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: result.data?.beatmaps?.map(convertBanchoBeatmap),
      status: result.status,
    };
  }

  async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const result = await this.authorizedGet<{ beatmaps: BanchoBeatmap[] }>(
      `api/v2/beatmaps?${ctx.beatmapIds.map(id => `ids[]=${id}`).join("&")}`,
    );

    if (!result || result.status !== 200) {
      return { result: null, status: result?.status ?? 500 };
    }

    return {
      result: result.data?.beatmaps?.map(b =>
        convertBanchoBeatmapset({
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

    // The fallback mirror must still see the callers query, so we don't modify ctx directly.
    const isSortQuery = ctx.query !== undefined && SORT_QUERIES.has(ctx.query);
    const params = {
      q: isSortQuery ? undefined : ctx.query,
      sort: ctx.query === undefined ? undefined : SORT_QUERIES.get(ctx.query),
      s: ctx.status?.map(status => this.mapStatusToRankStatus(status).toString()),
      m: ctx.mode,
      nsfw: true, // TODO: Maybe make this configurable?
    };

    const result = await this.authorizedGet<BanchoBeatmapsetSearchResult>(`api/v2/beatmapsets/search`, {
      params: { ...params, page },
      paramsSerializer: { indexes: null },
    });

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    let { beatmapsets } = result.data;

    if (ctx.limit && ctx.limit <= BEATMAPS_SEARCH_MAX_RESULTS_LIMIT) {
      if (ctx.limit < BANCHO_SEARCH_PAGE_SIZE) {
        beatmapsets = beatmapsets.slice(0, ctx.limit);
      }

      if (ctx.limit > BANCHO_SEARCH_PAGE_SIZE && page < BANCHO_SEARCH_PAGES_LIMIT) {
        const resultForAdditionalBeatmaps = await this.authorizedGet<BanchoBeatmapsetSearchResult>(`api/v2/beatmapsets/search`, {
          params: { ...params, page: page + 1 },
          paramsSerializer: { indexes: null },
        });

        if (resultForAdditionalBeatmaps && resultForAdditionalBeatmaps.status === 200 && resultForAdditionalBeatmaps.data) {
          beatmapsets.push(...resultForAdditionalBeatmaps.data.beatmapsets.slice(0, ctx.limit - BANCHO_SEARCH_PAGE_SIZE));
        }
      }
    }

    return {
      result: beatmapsets.map(convertBanchoBeatmapset),
      status: result.status,
    };
  }

  private async authorizedGet<T>(endpoint: string, config?: AxiosRequestConfig) {
    return this.api.get<T>(endpoint, {
      config: {
        ...config,
        headers: {
          Authorization: `Bearer ${await this.banchoService.getBanchoClientToken()}`,
        },
      },
    });
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
      case RankStatusInt.RANKED:
        return RankStatus.RANKED;
      default:
        return status satisfies never;
    }
  }
}
