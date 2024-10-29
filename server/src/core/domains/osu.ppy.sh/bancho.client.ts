import { BaseClient } from "../../abstracts/domain/client.abstract";
import {
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  ResultWithPrice,
} from "../../abstracts/domain/client.types";
import { Beatmap, Beatmapset } from "../../../types/beatmap";
import logger from "../../../utils/logger";
import { BanchoService } from "./bancho.service";

export class BanchoClient extends BaseClient {
  private readonly banchoService = new BanchoService(this.api);

  constructor() {
    super({
      baseUrl: "https://osu.ppy.sh",
      rateLimit: {
        header: "RateLimit-Remaining",
        window: 60,
        limit: 60,
      },
    });

    logger.info("BanchoClient initialized");
  }

  async getBeatmapSet(
    ctx: GetBeatmapSetOptions
  ): Promise<ResultWithPrice<Beatmapset | null>> {
    if (ctx.beatmapSetId) {
      return {
        result: await this._getBeatmapSet(ctx.beatmapSetId),
        price: 1,
      };
    } else if (ctx.beatmapId) {
      const beatmap = await this._getBeatmapById(ctx.beatmapId);

      if (!beatmap) {
        return { result: null, price: 1 };
      }

      return {
        result: await this._getBeatmapSet(beatmap.beatmapset_id),
        price: 2,
      };
    } else if (ctx.beatmapHash) {
      return {
        result: null, // Not supported
        price: 0,
      };
    }

    throw new Error("Invalid arguments");
  }

  async getBeatmap(
    ctx: GetBeatmapOptions
  ): Promise<ResultWithPrice<Beatmap | null>> {
    if (ctx.beatmapId) {
      return {
        result: await this._getBeatmapById(ctx.beatmapId),
        price: 1,
      };
    } else if (ctx.beatmapHash) {
      return {
        result: null, // Not supported
        price: 0,
      };
    }

    throw new Error("Invalid arguments");
  }

  private async _getBeatmapSet(
    beatmapSetId: number
  ): Promise<Beatmapset | null> {
    const result = await this.api.get<Beatmapset>(
      `api/v2/beatmapsets/${beatmapSetId}`,
      {
        config: {
          headers: {
            Authorization: `Bearer ${await this.osuApiKey}`,
          },
        },
      }
    );

    if (result.status !== 200) {
      return null;
    }

    return this._convertBeatmapSet(result.data);
  }

  private async _getBeatmapById(beatmapId: number): Promise<Beatmap | null> {
    const result = await this.api.get<Beatmap>(`api/v2/beatmaps/${beatmapId}`, {
      config: {
        headers: {
          Authorization: `Bearer ${await this.osuApiKey}`,
        },
      },
    });

    if (result.status !== 200) {
      return null;
    }

    return this._convertBeatmap(result.data);
  }

  private get osuApiKey() {
    return this.banchoService.getBanchoClientToken();
  }

  private _convertBeatmap(beatmap: Beatmap): Beatmap {
    return beatmap;
  }

  private async _convertBeatmapSet(
    beatmapSet: Beatmapset
  ): Promise<Beatmapset> {
    return beatmapSet;
  }
}
