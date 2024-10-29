import {
  OsuApiCredentials,
  OsuApiCredentialsRequest,
  OsuApiCredentialsResponse,
} from "./bancho.types";
import { BaseApi } from "../../abstracts/api/base-api.abstract";
import config from "../../../config";

export class BanchoService {
  private readonly api: BaseApi;
  private clientCredentials: OsuApiCredentials | null = null;

  constructor(api: BaseApi) {
    this.api = api;
  }

  async getBanchoClientToken(): Promise<string> {
    if (
      !this.clientCredentials ||
      this.clientCredentials.expires_on <= new Date().getTime()
    ) {
      this.clientCredentials = await this._fetchBanchoClientToken();
    }

    return this.clientCredentials.access_token;
  }

  private async _fetchBanchoClientToken(): Promise<OsuApiCredentials> {
    const request = await this.api.post<
      OsuApiCredentialsResponse,
      OsuApiCredentialsRequest
    >("oauth/token", {
      body: {
        client_id: config.BANCHO_CLIENT_ID,
        client_secret: config.BANCHO_CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "public",
      },
    });

    if (request.status !== 200) {
      // TODO: Better error handling
      throw new Error("Failed to fetch Bancho client token");
    }

    return {
      ...request.data,
      expires_on: Date.now() + request.data.expires_in * 1000,
    };
  }
}
