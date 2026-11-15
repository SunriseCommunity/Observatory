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
import type { StorageService } from "@observatory/storage";

import { BanchoClient, DirectClient } from "../clients";
import type { MirrorClient } from "../clients/base-client.types";
import { ClientAbilities } from "../clients/base-client.types";
import { OsulabsClient } from "../clients/beatmaps.download/osulabs.client";
import { MinoClient } from "../clients/catboy.best/mino.client";
import { GatariClient } from "../clients/gatari.pw/gatari.client";
import { NerinyanClient } from "../clients/nerinyan.moe/nerinyan.client";
import {
  getMirrorsRequestsQueryData,
  TIME_RANGES_FOR_MIRRORS_STATS,
} from "../helper/mirrors-stats.helper";
import {
  getMirrorsRequestsCountForStats,
} from "../repository/requests.repository";
import { MirrorsBenchmarkService } from "./mirrors-benchmark.service";

const DEFAULT_CLIENT_PROPS = {
  weights: {
    download: 0,
    API: 0,
    failrate: 0,
  },
};

export class MirrorsService {
  private readonly managerService: MirrorsBenchmarkService;
  private readonly storageManager: StorageService;

  private readonly clients: MirrorClient[] = [];

  constructor(storageManager: StorageService) {
    this.clients = [];

    this.storageManager = storageManager;

    if (!config.MirrorsToIgnore.includes("direct")) {
      const directClient = new DirectClient();

      this.clients.push({
        client: directClient,
        ...DEFAULT_CLIENT_PROPS,
      });
    }

    if (!config.MirrorsToIgnore.includes("mino")) {
      const minoClient = new MinoClient(storageManager);

      this.clients.push({
        client: minoClient,
        ...DEFAULT_CLIENT_PROPS,
      });
    }

    if (!config.MirrorsToIgnore.includes("osulabs")) {
      const osulabsClient = new OsulabsClient(storageManager);

      this.clients.push({
        client: osulabsClient,
        ...DEFAULT_CLIENT_PROPS,
      });
    }

    if (!config.MirrorsToIgnore.includes("gatari")) {
      const gatariClient = new GatariClient();

      this.clients.push({
        client: gatariClient,
        ...DEFAULT_CLIENT_PROPS,
      });
    }

    if (!config.MirrorsToIgnore.includes("nerinyan")) {
      const nerinyanClient = new NerinyanClient();

      this.clients.push({
        client: nerinyanClient,
        ...DEFAULT_CLIENT_PROPS,
      });
    }

    if (!config.MirrorsToIgnore.includes("bancho") && config.UseBancho) {
      const banchoClient = new BanchoClient();

      this.clients.push({
        client: banchoClient,
        ...DEFAULT_CLIENT_PROPS,
      });
    }

    this.managerService = new MirrorsBenchmarkService(this.clients);
  }

  async fetchMirrorsData() {
    await this.managerService.fetchMirrorsData();
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ResultWithStatus<Beatmapset>> {
    if (!ctx.beatmapSetId) {
      throw new Error("beatmapSetId is required to fetch beatmap set");
    }

    const criteria = ClientAbilities.GetBeatmapSetById;

    return await this.useMirror<Beatmapset>(ctx, criteria, "getBeatmapSet");
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<ResultWithStatus<Beatmap>> {
    if (!ctx.beatmapId && !ctx.beatmapHash && !ctx.beatmapFilename) {
      throw new Error("Either beatmapId, beatmapHash or beatmapFilename is required");
    }

    let criteria: ClientAbilities;
    if (ctx.beatmapId) {
      criteria = ctx.allowMissingNonBeatmapValues
        ? ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues
        : ClientAbilities.GetBeatmapById;
    }
    else if (ctx.beatmapHash) {
      criteria = ctx.allowMissingNonBeatmapValues
        ? ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues
        : ClientAbilities.GetBeatmapByHash;
    }
    else {
      criteria = ClientAbilities.GetBeatmapByFilename;
    }

    return await this.useMirror<Beatmap>(ctx, criteria, "getBeatmap");
  }

  async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const criteria = ClientAbilities.SearchBeatmapsets;

    return await this.useMirror<Beatmapset[]>(
      ctx,
      criteria,
      "searchBeatmapsets",
    );
  }

  async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ResultWithStatus<Beatmap[]>> {
    const { ids } = ctx;

    if (!ids || ids.length === 0) {
      throw new Error("ids is required to fetch beatmaps");
    }

    const criteria = ClientAbilities.GetBeatmaps;

    return await this.useMirror<Beatmap[]>(ctx, criteria, "getBeatmaps");
  }

  async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    const { beatmapIds } = ctx;

    if (!beatmapIds || beatmapIds.length === 0) {
      throw new Error("beatmapIds is required to fetch beatmapsets");
    }

    const criteria = ClientAbilities.GetBeatmapsetsByBeatmapIds;

    return await this.useMirror<Beatmapset[]>(
      ctx,
      criteria,
      "getBeatmapsetsByBeatmapIds",
    );
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    if (!ctx.beatmapSetId) {
      throw new Error("beatmapSetId is required to download beatmap set");
    }

    let criteria: ClientAbilities;
    if (ctx.noVideo) {
      criteria = ClientAbilities.DownloadBeatmapSetByIdNoVideo;
    }
    else {
      criteria = ClientAbilities.DownloadBeatmapSetById;
    }

    return await this.useMirror<ArrayBuffer>(
      ctx,
      criteria,
      "downloadBeatmapSet",
    );
  }

  async downloadOsuBeatmap(
    ctx: DownloadOsuBeatmap,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const criteria = ClientAbilities.DownloadOsuBeatmap;

    return await this.useMirror<ArrayBuffer>(
      ctx,
      criteria,
      "downloadOsuBeatmap",
    );
  }

  async getMirrorsStatistics() {
    const data = await getMirrorsRequestsCountForStats(
      getMirrorsRequestsQueryData(this.clients),
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

    return {
      activeMirrors: await Promise.all(
        this.clients.map(async (c) => {
          const { baseUrl } = c.client.clientConfig;
          const stats = Object.fromEntries(
            TIME_RANGES_FOR_MIRRORS_STATS.map(({ name, time }) => [
              name,
              {
                total: Number(
                  dataMap.get(`${baseUrl}|${time}|null`) || 0,
                ),
                successful: Number(
                  dataMap.get(`${baseUrl}|${time}|success`)
                  || 0,
                ),
                failed: Number(
                  dataMap.get(`${baseUrl}|${time}|fail`) || 0,
                ),
              },
            ]),
          );

          return {
            name: c.client.constructor.name,
            url: baseUrl,
            onCooldownUntil: c.client.onCooldownUntil(),
            rateLimit: c.client.getCapacities(),
            requests: stats,
          };
        }),
      ),
      rateLimitsTotal: this.clients.reduce(
        (acc, c) => {
          const clientCapacities = c.client.getCapacities();

          for (const capacity of clientCapacities) {
            if (!acc[capacity.ability]) {
              acc[capacity.ability] = { total: 0, remaining: 0 };
            }
            acc[capacity.ability].total += capacity.limit;
            acc[capacity.ability].remaining += capacity.remaining;
          }

          return acc;
        },
        {} as Record<string, { total: number; remaining: number }>,
      ),
    };
  }

  private async useMirror<T>(
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
    for (const _ of this.clients) {
      const client = this.getClient(criteria, usedClients);
      if (!client)
        return { result: null, status: 501 };

      const result = await (client.client[action] as (ctx: any) => Promise<ResultWithStatus<T>>)(ctx);
      if (result.result || result.status === 404)
        return result;

      usedClients.push(client);
    }
    return { result: null, status: 502 };
  }

  private getClient(
    criteria: ClientAbilities,
    ignore?: MirrorClient[],
  ): MirrorClient | null {
    const clients = this.clients
      .filter(client =>
        client.client.clientConfig.abilities.includes(criteria),
      )
      .filter(client => !ignore || !ignore.includes(client));

    const isSearchCriteria = criteria === ClientAbilities.SearchBeatmapsets;

    const client = isSearchCriteria
      ? this.getClientForSearchEndpoint(clients)
      : this.getClientByWeight(criteria, clients);

    return client;
  }

  // We want to prioritise a single mirror for all search endpoints while it's available to have consistent results from page to page.
  private getClientForSearchEndpoint(clients: MirrorClient[]): MirrorClient | null {
    const minoClient = clients.find(client => client.client.clientConfig.baseUrl === "https://us.catboy.best"
      || client.client.clientConfig.baseUrl === "https://catboy.best"); // TODO: I don't like how we address them by url, should be addressed later.

    if (minoClient) {
      return minoClient;
    }

    const banchoClient = clients.find(client => client.client.clientConfig.baseUrl === "https://osu.ppy.sh");
    if (banchoClient) {
      return banchoClient;
    }

    return this.getClientByWeight(ClientAbilities.SearchBeatmapsets, clients);
  }

  private getClientByWeight(
    criteria: ClientAbilities,
    clients: MirrorClient[],
  ): MirrorClient | null {
    let bestClient: MirrorClient | null = null;
    let bestWeight = -1;

    for (const client of clients) {
      const weight = this.getClientWeight(client, criteria);

      if (weight > bestWeight) {
        bestWeight = weight;
        bestClient = client;
      }
    }

    if (bestWeight === -1 || !bestClient) {
      return null;
    }

    return bestClient;
  }

  private getClientWeight(client: MirrorClient, ability: ClientAbilities) {
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

  private log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`MirrorsManager: ${message}`);
  }
}
