import { Elysia } from "elysia";

import { TryConvertToGamemode } from "./helper/gamemode.helper";
import type { Score, ScoreShort } from "./model/calculator.model";
import * as CalculatorModel from "./model/calculator.schema";
import { CalculatorService } from "./service/calculator.service";

export const calculatorController = new Elysia({ prefix: "/calculator" })
  .get("/version", {
    detail: { tags: ["Calculators"] },
  }, () => {
    return {
      rosu: CalculatorService.GetRosuVersion(),
    };
  })
  .get("/beatmap/:id", {
    params: CalculatorModel.BeatmapByIdGet.Params,
    query: CalculatorModel.BeatmapByIdGet.Query,
    detail: { tags: ["Calculators"] },
  }, async ({
    params: { id },
    query: {
      acc,
      mode,
      mods,
      combo,
      misses,
      isScoreFailed,
      isPlayedOnLazer,
    },
    set,
  }) => {
    set.headers["X-Rosu-Version"] = CalculatorService.GetRosuVersion();

    const scores: ScoreShort[] = [];
    const beatmapMode = TryConvertToGamemode(mode);

    for (const accuracy of acc ?? [100]) {
      scores.push({
        accuracy,
        mode: beatmapMode,
        mods,
        combo,
        misses,
        isScoreFailed: isScoreFailed ?? false,
        isLazer: isPlayedOnLazer ?? false,
      });
    }

    const results
      = await CalculatorService.CalculateBeatmapPerformances(
        id,
        scores,
      );

    return results;
  })
  .post("/score", {
    body: CalculatorModel.ScorePost.Body,
    detail: { tags: ["Calculators"] },
  }, async ({
    body: {
      beatmapId,
      beatmapHash,
      mode,
      acc,
      mods,
      combo,
      n300,
      nGeki,
      n100,
      nKatu,
      n50,
      misses,
      legacyTotalScore,
      isScoreFailed,
      isPlayedOnLazer,
    },
    set,
  }) => {
    set.headers["X-Rosu-Version"] = CalculatorService.GetRosuVersion();

    const beatmapMode = TryConvertToGamemode(mode);

    const score: Score = {
      accuracy: acc,
      mode: beatmapMode,
      mods,
      n300,
      nGeki,
      n100,
      nKatu,
      n50,
      combo,
      misses,
      legacyTotalScore,
      isScoreFailed: isScoreFailed ?? false,
      isLazer: isPlayedOnLazer ?? false,
    };

    const results
      = await CalculatorService.CalculateScorePerformance(
        beatmapId,
        score,
        beatmapHash,
      );

    return results;
  });
