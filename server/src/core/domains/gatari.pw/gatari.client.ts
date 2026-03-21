import logger from "../../../utils/logger";
import { BaseClient } from "../../abstracts/client/base-client.abstract";
import type {
  DownloadBeatmapSetOptions,
  ResultWithStatus,
} from "../../abstracts/client/base-client.types";
import {
  ClientAbilities,
} from "../../abstracts/client/base-client.types";

export class GatariClient extends BaseClient {
  constructor() {
    super(
      {
        baseUrl: "https://osu.gatari.pw",
        abilities: [ClientAbilities.DownloadBeatmapSetByIdNoVideo],
      },
      {
        rateLimits: [],
      },
    );

    logger.info("GatariClient initialized");
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const result = await this.api.get<ArrayBuffer>(
            `d/${ctx.beatmapSetId}`,
            {
              config: {
                responseType: "arraybuffer",
              },
            },
    );

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return { result: result.data, status: result.status };
  }
}
