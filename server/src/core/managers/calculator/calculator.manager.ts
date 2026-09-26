import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { HttpStatusCode } from "axios";
import { Beatmap } from "rosu-pp-js";

import { BeatmapsManagerInstance } from "../../../plugins/beatmapManager";
import type { BeatmapsManager } from "../beatmaps/beatmaps.manager";
import { CalculatorService } from "./calculator.service";
import type { Score, ScoreShort } from "./calculator.types";

const rosuPackage: unknown = JSON.parse(
  readFileSync(fileURLToPath(import.meta.resolve("rosu-pp-js/package.json")), "utf8"),
);

if (
  typeof rosuPackage !== "object"
  || rosuPackage === null
  || !("version" in rosuPackage)
  || typeof rosuPackage.version !== "string"
) {
  throw new Error("Failed to read rosu-pp-js version from its package.json");
}

const ROSU_VERSION = rosuPackage.version;

export class CalculatorManager {
  private readonly calculatorService: CalculatorService;
  private readonly beatmapsManager: BeatmapsManager;

  constructor() {
    this.calculatorService = new CalculatorService();
    this.beatmapsManager = BeatmapsManagerInstance;
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

    const results = this.calculatorService.CalculateBeatmapPerfomance(
      beatmap,
      scores,
    );

    beatmap.free();

    return results;
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

    const result = this.calculatorService.CalculateScorePerfomance(
      beatmap,
      score,
    );

    beatmap.free();

    return result;
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
