import type { DownloadBeatmapSetOptions, ResultWithStatus } from "@observatory/common/types/beatmap-query";

import { BaseClient, DOWNLOAD_TIMEOUT_MS } from "../base-client.abstract";
import { ClientAbilities } from "../base-client.types";

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
  }

  async downloadBeatmapSet(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ResultWithStatus<ArrayBuffer>> {
    const result = await this.api.get<ArrayBuffer>(
      `d/${ctx.beatmapSetId}`,
      {
        config: {
          responseType: "arraybuffer",
          timeout: DOWNLOAD_TIMEOUT_MS,
        },
      },
    );

    if (!result || result.status !== 200 || !result.data) {
      return { result: null, status: result?.status ?? 500 };
    }

    return { result: result.data, status: result.status };
  }
}
