/* eslint-disable unused-imports/no-unused-vars -- Abstract class with unimplemented methods */
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
import axios from "axios";

import packageJson from "../../../../../package.json";
import { BaseApi } from "./api/base-api.abstract";
import type { ClientOptions } from "./base-client.types";
import { ClientAbilities } from "./base-client.types";
import { ApiRateLimiter } from "./ratelimiter/rate-limiter.abstract";
import type { RateLimitOptions } from "./ratelimiter/rate-limiter.types";

const API_TIMEOUT_MS = 10_000;
export const DOWNLOAD_TIMEOUT_MS = 60_000;

export class BaseClient {
  protected storageManager?: StorageService;

  protected config: ClientOptions;
  protected api: ApiRateLimiter;
  protected baseApi: BaseApi;

  constructor(
    config: ClientOptions,
    rateLimitConfig: RateLimitOptions,
    storageManager?: StorageService,
  ) {
    this.config = config;

    this.storageManager = storageManager;

    this.baseApi = new BaseApi(axios.create({
      headers: { "User-Agent": `observatory-sunrise/${packageJson.version}` },
    }), {
      baseURL: this.config.baseUrl,
      timeout: API_TIMEOUT_MS,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const domainHash = Bun.hash(this.config.baseUrl).toString();
    this.api = new ApiRateLimiter(
      domainHash,
      this.baseApi,
      rateLimitConfig,
    );

    logger.info({ mirror: this.baseApi.mirror }, `${this.constructor.name} initialized`);
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
    const { rateLimits } = this.api.config;
    const limit
      = rateLimits.find(rateLimit => rateLimit.abilities?.includes(ability))
        || rateLimits.find(rateLimit => rateLimit.routes.includes("/"));

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
    return this.api.config.rateLimits.flatMap(rateLimit =>
      rateLimit.abilities.map(ability => ({
        ability: ClientAbilities[ability],
        ...this.getCapacity(ability),
      })),
    );
  }

  onCooldownUntil(): number | undefined {
    return this.api.onCooldownUntil;
  }

  get clientConfig(): ClientOptions {
    return this.config;
  }
  
  get mirror(): string {
    return this.baseApi.mirror;
  }
}
