import { BeatmapsPublic } from "@observatory/beatmaps";
import { HttpStatusCode } from "axios";
import { Beatmap } from "rosu-pp-js";
import rosuPackage from "rosu-pp-js/package.json";

import { PerformanceHelper } from "../helper/performance.helper";
import type { Score, ScoreShort } from "../model/calculator.model";

const ROSU_VERSION = rosuPackage.version;

export abstract class CalculatorService {
  static GetRosuVersion() {
    return ROSU_VERSION;
  }

  static async CalculateBeatmapPerformances(
    beatmapId: number,
    scores: ScoreShort[],
  ) {
    const beatmap = await CalculatorService.GetBeatmapHash(beatmapId);
    if (!(beatmap instanceof Beatmap)) {
      return beatmap;
    }

    try {
      return PerformanceHelper.CalculateBeatmapPerfomance(
        beatmap,
        scores,
      );
    }
    finally {
      beatmap.free();
    }
  }

  static async CalculateScorePerformance(
    beatmapId: number,
    score: Score,
    beatmapHash?: string,
  ) {
    const beatmap = await CalculatorService.GetBeatmapHash(beatmapId, beatmapHash);
    if (!(beatmap instanceof Beatmap)) {
      return beatmap;
    }

    try {
      return PerformanceHelper.CalculateScorePerfomance(
        beatmap,
        score,
      );
    }
    finally {
      beatmap.free();
    }
  }

  private static async GetBeatmapHash(beatmapId: number, beatmapHash?: string) {
    const beatmapBuffer = await BeatmapsPublic.downloadOsuBeatmap({
      beatmapId,
    });

    if (beatmapBuffer.data === null) {
      return beatmapBuffer;
    }

    if (beatmapHash) {
      const fileHash = PerformanceHelper.GetHashOfOsuFile(
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

    const beatmap = PerformanceHelper.ConvertBufferToBeatmap(
      beatmapBuffer.data,
    );

    return beatmap;
  }
}
