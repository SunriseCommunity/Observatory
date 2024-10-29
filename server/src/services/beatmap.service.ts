import { Beatmap, Beatmapset } from "../types/beatmap";
import { MirrorManager } from "../core/managers/mirror.manager";

export class BeatmapService {
  private readonly _mirrorManager: MirrorManager;

  constructor(minorManager: MirrorManager) {
    this._mirrorManager = minorManager;
  }

  async getBeatmap(id: number): Promise<Beatmap | null> {
    const beatmap = await this._mirrorManager.getBeatmap({ beatmapId: id });

    if (!beatmap) {
      return null;
    }

    return beatmap;
  }

  async getBeatmapSet(id: number): Promise<Beatmapset | null> {
    const beatmapSet = await this._mirrorManager.getBeatmapSet({
      beatmapSetId: id,
    });

    if (!beatmapSet) {
      return null;
    }

    return beatmapSet;
  }
}
