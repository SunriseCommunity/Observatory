/* eslint-disable unused-imports/no-unused-vars -- Abstract class with unimplemented methods */
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
import axios from "axios";

import { ConvertHelper } from "../helper/convert.helper";
import { BaseApi } from "./api/base-api.abstract";
import type { ClientOptions } from "./base-client.types";
import { ClientAbilities } from "./base-client.types";
import { ApiRateLimiter } from "./ratelimiter/rate-limiter.abstract";
import type { RateLimitOptions } from "./ratelimiter/rate-limiter.types";

export class BaseClient {
  protected storageManager?: StorageService;

  protected config: ClientOptions;
  protected api: ApiRateLimiter;
  protected baseApi: BaseApi;

  protected convertService: ConvertHelper;

  constructor(
    config: ClientOptions,
    rateLimitConfig: RateLimitOptions,
    storageManager?: StorageService,
  ) {
    this.config = config;

    this.storageManager = storageManager;

    this.baseApi = new BaseApi(axios.create(), {
      baseURL: this.config.baseUrl,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    this.convertService = new ConvertHelper(this.config.baseUrl);

    const domainHash = Bun.hash(this.config.baseUrl).toString();
    this.api = new ApiRateLimiter(
      domainHash,
      this.baseApi,
      rateLimitConfig,
    );
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<ResultWithStatus<Beatmapset>> {
    throw new Error("Method not implemented.");
  }

  async getBeatmaps(
    ctx: GetBeatmapsOptions,
  ): Promise<ResultWithStatus<Beatmap[]>> {
    throw new Error("Method not implemented.");
  }

  async searchBeatmapsets(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    throw new Error("Method not implemented.");
  }

  async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<ResultWithStatus<Beatmap>> {
    throw new Error("Method not implemented.");
  }

  async getBeatmapsetsByBeatmapIds(
    ctx: GetBeatmapsetsByBeatmapIdsOptions,
  ): Promise<ResultWithStatus<Beatmapset[]>> {
    throw new Error("Method not implemented.");
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    throw new Error("Method not implemented.");
  }

  async downloadOsuBeatmap(
    ctx: DownloadOsuBeatmap,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    throw new Error("Method not implemented.");
  }

  getCapacity(ability: ClientAbilities): {
    limit: number;
    remaining: number;
  } {
    const limit
      = this.api.limiterConfig.rateLimits.find(rateLimit =>
        rateLimit.abilities?.includes(ability),
      )
      || this.api.limiterConfig.rateLimits.find(rateLimit =>
        rateLimit.routes.includes("/"),
      );

    if (!limit) {
      throw new Error(
                `No rate limit found for ${this.config.baseUrl} / ${ability}`,
      );
    }

    return this.api.getCapacity(limit);
  }

  getCapacities(): Array<{
    ability: string;
    limit: number;
    remaining: number;
  }> {
    const { rateLimits } = this.api.limiterConfig;
    const capacities = rateLimits.flatMap(rateLimit =>
      rateLimit.abilities.map(ability => ({
        ability: ClientAbilities[ability],
        limit: this.getCapacity(ability).limit,
        remaining: this.getCapacity(ability).remaining,
      })),
    );

    return capacities;
  }

  onCooldownUntil(): number | undefined {
    return this.api.limiterConfig.onCooldownUntil;
  }

  get clientConfig(): ClientOptions {
    return this.config;
  }
}
