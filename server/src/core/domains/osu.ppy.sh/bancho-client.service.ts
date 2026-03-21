import config from "../../../config";
import type { BaseApi } from "../../abstracts/api/base-api.abstract";
import type {
  OsuApiCredentials,
  OsuApiCredentialsRequest,
  OsuApiCredentialsResponse,
} from "./bancho-client.types";

export class BanchoService {
  private readonly api: BaseApi;
  private clientCredentials: OsuApiCredentials | null = null;

  constructor(api: BaseApi) {
    this.api = api;
  }

  async getBanchoClientToken(): Promise<string> {
    if (
      !this.clientCredentials
      || this.clientCredentials.expires_on <= Date.now()
    ) {
      this.clientCredentials = await this._fetchBanchoClientToken();
    }

    return this.clientCredentials.access_token;
  }

  private async _fetchBanchoClientToken(): Promise<OsuApiCredentials> {
    if (!config.BANCHO_CLIENT_ID || !config.BANCHO_CLIENT_SECRET) {
      throw new Error(
        "Requesting Bancho client token without client ID/secret",
      );
    }

    const result = await this.api.post<
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

    if (!result || result.status !== 200 || !result.data) {
      throw new Error(
        "BanchoService: Failed to fetch Bancho client token. Please check your client ID/secret",
      );
    }

    return {
      ...result.data,
      expires_on: Date.now() + result.data.expires_in * 1000,
    };
  }
}
