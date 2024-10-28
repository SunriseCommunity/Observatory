import { DirectClient } from "../domains/osu.direct/direct.client";
import logger from "../utils/logger";
import { Beatmap } from "../types/beatmap";

export class BeatmapService {
  async get(id: number): Promise<Beatmap | null> {
    const direct = new DirectClient();
    try {
      const beatmap = await direct.getBeatmap({ beatmapId: id });

      return beatmap.result;
    } catch (error) {
      logger.error(error);
      return null;
    }
  }
}
