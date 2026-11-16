import type { BeatmapsService } from "@observatory/beatmaps";
import { HttpStatusCode } from "axios";
import { Beatmap } from "rosu-pp-js";
import rosuPackage from "rosu-pp-js/package.json";

import { PerformanceHelper } from "../helper/performance.helper";
import type { Score, ScoreShort } from "../model/calculator.model";

const ROSU_VERSION = rosuPackage.version;

export class CalculatorService {
  private readonly calculatorService: PerformanceHelper;

  constructor(private readonly beatmapsManager: BeatmapsService) {
    this.calculatorService = new PerformanceHelper();
  }

  public GetRosuVersion() {
    return ROSU_VERSION;
  }

  public async CalculateBeatmapPerformances(
    beatmapId: number,
    scores: ScoreShort[],
  ) {
    const beatmap = await this.GetBeatmapHash(beatmapId);
    if (!(beatmap instanceof Beatmap)) {
      return beatmap;
    }

    try {
      return this.calculatorService.CalculateBeatmapPerfomance(
        beatmap,
        scores,
      );
    }
    finally {
      beatmap.free();
    }
  }

  public async CalculateScorePerformance(
    beatmapId: number,
    score: Score,
    beatmapHash?: string,
  ) {
    const beatmap = await this.GetBeatmapHash(beatmapId, beatmapHash);
    if (!(beatmap instanceof Beatmap)) {
      return beatmap;
    }

    try {
      return this.calculatorService.CalculateScorePerfomance(
        beatmap,
        score,
      );
    }
    finally {
      beatmap.free();
    }
  }

  private async GetBeatmapHash(beatmapId: number, beatmapHash?: string) {
    const beatmapBuffer = await this.beatmapsManager.downloadOsuBeatmap({
      beatmapId,
    });

    if (beatmapBuffer.data === null) {
      return beatmapBuffer;
    }

    if (beatmapHash) {
      const fileHash = this.calculatorService.GetHashOfOsuFile(
        beatmapBuffer.data,
      );

      if (fileHash !== beatmapHash) {
        return {
          data: null,
          status: HttpStatusCode.NotFound,
          message: "Osu file with provided beatmap hash not found",
        };
      }
    }

    const beatmap = this.calculatorService.ConvertBufferToBeatmap(
      beatmapBuffer.data,
    );

    return beatmap;
  }
}
