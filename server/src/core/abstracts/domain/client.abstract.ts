import axios, { Axios, AxiosInstance } from "axios";
import {
  ClientOptions,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  ResultWithPrice,
} from "./client.types";
import { BaseApi } from "../api/base-api.abstract";
import { Beatmap, Beatmapset } from "../../../types/beatmap";

export class BaseClient {
  protected config: ClientOptions;
  protected api: BaseApi;

  constructor(config: ClientOptions) {
    this.config = config;
    this.api = new BaseApi(axios.create(), {
      baseURL: this.config.baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions
  ): Promise<ResultWithPrice<Beatmapset | null>> {
    throw new Error("Method not implemented.");
  }

  async getBeatmap(
    ctx: GetBeatmapOptions
  ): Promise<ResultWithPrice<Beatmap | null>> {
    throw new Error("Method not implemented.");
  }
}
