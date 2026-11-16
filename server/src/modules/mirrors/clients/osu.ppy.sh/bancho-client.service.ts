import config from "@observatory/common/config";
import logger from "@observatory/common/observability/logger";

import type { BaseApi } from "../api/base-api.abstract";
import type {
  OsuApiCredentials,
  OsuApiCredentialsRequest,
  OsuApiCredentialsResponse,
} from "./bancho-client.types";

const TOKEN_REFRESH_MARGIN_MS = 60_000;

export class BanchoService {
  private readonly api: BaseApi;
  private clientCredentials: OsuApiCredentials | null = null;
  private pendingCredentials?: Promise<OsuApiCredentials>;

  constructor(api: BaseApi) {
    this.api = api;
  }

  async getBanchoClientToken(): Promise<string> {
    if (
      !this.clientCredentials
      || this.clientCredentials.expires_on - TOKEN_REFRESH_MARGIN_MS <= Date.now()
    ) {
      this.pendingCredentials ??= this.fetchBanchoClientToken().finally(() => {
        this.pendingCredentials = undefined;
      });
      this.clientCredentials = await this.pendingCredentials;
    }

    return this.clientCredentials.access_token;
  }

  private async fetchBanchoClientToken(): Promise<OsuApiCredentials> {
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
        `BanchoService: Failed to fetch Bancho client token (status ${result?.status ?? "none"}). Please check your client ID/secret`,
      );
    }

    const expiresOn = Date.now() + result.data.expires_in * 1000;
    logger.info({ mirror: this.api.mirror, expires_at: new Date(expiresOn).toISOString() }, "Bancho client token refreshed");

    return {
      ...result.data,
      expires_on: expiresOn,
    };
  }
}
