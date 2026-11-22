import type { Mirror } from "@observatory/common/config";
import config from "@observatory/common/config";
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

import type { BaseClient } from "../clients/base-client.abstract";
import type { MirrorClient } from "../clients/base-client.types";
import { ClientAbilities } from "../clients/base-client.types";
import { MinoClient } from "../clients/catboy.best/mino.client";
import { GatariClient } from "../clients/gatari.pw/gatari.client";
import { NerinyanClient } from "../clients/nerinyan.moe/nerinyan.client";
import { DirectClient } from "../clients/osu.direct/direct.client";
import { BanchoClient } from "../clients/osu.ppy.sh/bancho.client";
import type { BeatmapWithSet } from "../model/mirrors.model";
import { RequestsRepository } from "../repository/requests.repository";
import { MirrorsBenchmarkHelper } from "./mirrors-benchmark.helper";
import {
  getMirrorsRequestsQueryData,
  getMirrorsStatsTimeRanges,
} from "./mirrors-stats.helper";

// In fallback order
const MIRRORS: Array<[name: Mirror, create: () => BaseClient]> = [
  ["direct", () => new DirectClient()],
  ["mino", () => new MinoClient()],
  ["gatari", () => new GatariClient()],
  ["nerinyan", () => new NerinyanClient()],
  ["bancho", () => new BanchoClient()],
];

export abstract class MirrorsHelper {
  private static clients: MirrorClient[] = MIRRORS
    .filter(([name]) => !config.MirrorsToIgnore.includes(name) && (name !== "bancho" || config.UseBancho))
    .map(([, create]) => ({
      client: create(),
      weights: { download: 0, API: 0, failrate: 0 },
    }));

  static async updateMirrorWeights() {
    await MirrorsBenchmarkHelper.updateWeights(MirrorsHelper.clients);
  }

  static async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ResultWithStatus<Beatmapset>> {
    if (!ctx.beatmapSetId) {
      throw new Error("beatmapSetId is required to fetch beatmap set");
    }

    return await MirrorsHelper.useMirror<Beatmapset>(ctx, ClientAbilities.GetBeatmapSetById, "getBeatmapSet");
  }

  static async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<BeatmapWithSet> {
    if (!ctx.beatmapId && !ctx.beatmapHash && !ctx.beatmapFilename) {
      throw new Error("Either beatmapId, beatmapHash or beatmapFilename is required");
    }

    if (ctx.beatmapFilename && !ctx.beatmapId && !ctx.beatmapHash) {
      return await MirrorsHelper.useMirror<Beatmap>(ctx, ClientAbilities.GetBeatmapByFilename, "getBeatmap");
    }

    const fullCriteria = ctx.beatmapId
      ? ClientAbilities.GetBeatmapById
      : ClientAbilities.GetBeatmapByHash;

    if (!ctx.allowMissingNonBeatmapValues) {
      return await MirrorsHelper.useMirror<Beatmap>(ctx, fullCriteria, "getBeatmap");
    }

    // Partial data is enough here, so ask the mirrors that only have partial data first.
    const partial = await MirrorsHelper.useMirror<Beatmap>(
      ctx,
      ctx.beatmapId
        ? ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues
        : ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues,
      "getBeatmap",
    );
    if (partial.result || partial.status === 404)
      return partial;

    const full = await MirrorsHelper.useMirror<Beatmap>(ctx, fullCriteria, "getBeatmap");
    return full.status === 501 ? partial : full;
  }

  static async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    return await MirrorsHelper.useMirror<Beatmapset[]>(ctx, ClientAbilities.SearchBeatmapsets, "searchBeatmapsets");
  }

  static async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ResultWithStatus<Beatmap[]>> {
    if (!ctx.ids || ctx.ids.length === 0) {
      throw new Error("ids is required to fetch beatmaps");
    }

    return await MirrorsHelper.useMirror<Beatmap[]>(ctx, ClientAbilities.GetBeatmaps, "getBeatmaps");
  }

  static async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    if (!ctx.beatmapIds || ctx.beatmapIds.length === 0) {
      throw new Error("beatmapIds is required to fetch beatmapsets");
    }

    return await MirrorsHelper.useMirror<Beatmapset[]>(
      ctx,
      ClientAbilities.GetBeatmapsetsByBeatmapIds,
      "getBeatmapsetsByBeatmapIds",
    );
  }

  static async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    if (!ctx.beatmapSetId) {
      throw new Error("beatmapSetId is required to download beatmap set");
    }

    return await MirrorsHelper.useMirror<ArrayBuffer>(
      ctx,
      ctx.noVideo
        ? ClientAbilities.DownloadBeatmapSetByIdNoVideo
        : ClientAbilities.DownloadBeatmapSetById,
      "downloadBeatmapSet",
    );
  }

  static async downloadOsuBeatmap(
    ctx: DownloadOsuBeatmap,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    return await MirrorsHelper.useMirror<ArrayBuffer>(ctx, ClientAbilities.DownloadOsuBeatmap, "downloadOsuBeatmap");
  }

  static async getMirrorsStatistics() {
    const timeRanges = getMirrorsStatsTimeRanges();
    const data = await RequestsRepository.getCountForStats(
      getMirrorsRequestsQueryData(MirrorsHelper.clients, timeRanges),
    );

    const dataMap = new Map<string, number>();
    for (const item of data) {
      const statusKey
        = item.statuscodes === null
          ? "null"
          : item.statuscodes.includes(200)
            ? "success"
            : item.statuscodes.includes(500)
              ? "fail"
              : "other";
      const key = `${item.name}|${item.createdafter}|${statusKey}`;
      dataMap.set(key, item.count);
    }

    const mirrors = MirrorsHelper.clients.map(c => ({ client: c.client, capacities: c.client.getCapacities() }));

    return {
      activeMirrors: mirrors.map(({ client, capacities }) => {
        const { baseUrl } = client.clientConfig;
        const stats = Object.fromEntries(
          timeRanges.map(({ name, time }) => [
            name,
            {
              total: Number(dataMap.get(`${baseUrl}|${time}|null`) || 0),
              successful: Number(dataMap.get(`${baseUrl}|${time}|success`) || 0),
              failed: Number(dataMap.get(`${baseUrl}|${time}|fail`) || 0),
            },
          ]),
        );

        return {
          name: client.constructor.name,
          url: baseUrl,
          onCooldownUntil: client.onCooldownUntil(),
          rateLimit: capacities,
          requests: stats,
        };
      }),
      rateLimitsTotal: mirrors.reduce(
        (acc, { capacities }) => {
          for (const capacity of capacities) {
            acc[capacity.ability] ??= { total: 0, remaining: 0 };
            acc[capacity.ability].total += capacity.limit;
            acc[capacity.ability].remaining += capacity.remaining;
          }

          return acc;
        },
        {} as Record<string, { total: number; remaining: number }>,
      ),
    };
  }

  private static async useMirror<T>(
    ctx:
      | DownloadBeatmapSetOptions
      | GetBeatmapOptions
      | GetBeatmapSetOptions
      | SearchBeatmapsetsOptions
      | GetBeatmapsOptions
      | DownloadOsuBeatmap
      | GetBeatmapsetsByBeatmapIdsOptions,
    criteria: ClientAbilities,
    action: keyof MirrorClient["client"],
  ): Promise<ResultWithStatus<T>> {
    const usedClients: MirrorClient[] = [];
    for (const _ of MirrorsHelper.clients) {
      const client = MirrorsHelper.getClient(criteria, usedClients);
      if (!client)
        return { result: null, status: 501 };

      let result: ResultWithStatus<T>;
      try {
        result = await (client.client[action] as (ctx: any) => Promise<ResultWithStatus<T>>)(ctx);
      }
      catch (error) {
        logger.error({ err: error, mirror: client.client.mirror, ability: ClientAbilities[criteria] }, "Mirror client threw");
        result = { result: null, status: 500 };
      }

      if (result.result || result.status === 404)
        return result;

      usedClients.push(client);
      logger.warn({
        mirror: client.client.mirror,
        ability: ClientAbilities[criteria],
        status: result.status,
        attempt: usedClients.length,
      }, "Mirror could not serve the request");
    }
    return { result: null, status: 502 };
  }

  private static getClient(
    criteria: ClientAbilities,
    ignore: MirrorClient[],
  ): MirrorClient | null {
    const clients = MirrorsHelper.clients.filter(client =>
      client.client.clientConfig.abilities.includes(criteria)
      && !ignore.includes(client),
    );

    return criteria === ClientAbilities.SearchBeatmapsets
      ? MirrorsHelper.getClientForSearchEndpoint(clients)
      : MirrorsHelper.getClientByWeight(criteria, clients);
  }

  // We want to prioritise a single mirror for all search endpoints while it's available to have consistent results from page to page.
  private static getClientForSearchEndpoint(clients: MirrorClient[]): MirrorClient | null {
    const minoClient = clients.find(client => client.client.clientConfig.baseUrl === "https://us.catboy.best"
      || client.client.clientConfig.baseUrl === "https://catboy.best"); // TODO: I don't like how we address them by url, should be addressed later.

    if (minoClient) {
      return minoClient;
    }

    const banchoClient = clients.find(client => client.client.clientConfig.baseUrl === "https://osu.ppy.sh");
    if (banchoClient) {
      return banchoClient;
    }

    return MirrorsHelper.getClientByWeight(ClientAbilities.SearchBeatmapsets, clients);
  }

  private static getClientByWeight(
    criteria: ClientAbilities,
    clients: MirrorClient[],
  ): MirrorClient | null {
    let bestClient: MirrorClient | null = null;
    let bestWeight = -1;

    for (const client of clients) {
      const weight = MirrorsHelper.getClientWeight(client, criteria);

      if (weight > bestWeight) {
        bestWeight = weight;
        bestClient = client;
      }
    }

    return bestClient;
  }

  private static getClientWeight(client: MirrorClient, ability: ClientAbilities) {
    const { limit, remaining } = client.client.getCapacity(ability);

    const percentageWeight = remaining / limit;
    const capacityBonus = Math.log10(remaining + 1);
    const rateLimitWeight = percentageWeight * capacityBonus;

    const isDownload = [
      ClientAbilities.DownloadBeatmapSetById,
      ClientAbilities.DownloadBeatmapSetByIdNoVideo,
      ClientAbilities.DownloadOsuBeatmap,
    ].includes(ability);

    const latencyWeight = isDownload
      ? client.weights.download
      : client.weights.API;

    return (
      Math.max(0.00000001, rateLimitWeight)
      * Math.max(0.00000001, latencyWeight)
      * Math.max(0.00000001, 1 - client.weights.failrate)
    );
  }
}
