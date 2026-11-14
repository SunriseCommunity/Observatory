import type { Elysia } from "elysia";
import { t } from "elysia";

import type {
  Score,
  ScoreShort,
} from "../../core/managers/calculator/calculator.types";
import { CalculatorManagerPlugin } from "../../plugins/calculatorManager";
import { TryConvertToGamemode } from "../../utils/beatmap";

export default (app: Elysia<any>) => {
  app.use(CalculatorManagerPlugin)
    .get("/version", {
      detail: { tags: ["Calculators"] },
    }, ({ CalculatorManagerInstance }) => {
      return {
        rosu: CalculatorManagerInstance.GetRosuVersion(),
      };
    })
    .get("/beatmap/:id", {
      params: t.Object({
        id: t.Number(),
      }),
      query: t.Object({
        acc: t.Optional(
          t.Array(t.Numeric(), { minItems: 1, maxItems: 5 }),
        ),
        mode: t.Optional(t.Numeric()),
        mods: t.Optional(t.Numeric()),
        combo: t.Optional(t.Numeric()),
        misses: t.Optional(t.Numeric()),
        isScoreFailed: t.Optional(t.BooleanString()),
        isPlayedOnLazer: t.Optional(t.BooleanString()),
      }),
      detail: { tags: ["Calculators"] },
    }, async ({
      CalculatorManagerInstance,
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
      set.headers["X-Rosu-Version"] = CalculatorManagerInstance.GetRosuVersion();

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
        = await CalculatorManagerInstance.CalculateBeatmapPerformances(
          id,
          scores,
        );

      return results;
    })
    .post("/score", {
      body: t.Object({
        beatmapId: t.Numeric(),
        beatmapHash: t.Optional(t.String()),
        acc: t.Optional(t.Numeric()),
        combo: t.Optional(t.Numeric()),
        n300: t.Optional(t.Numeric()),
        nGeki: t.Optional(t.Numeric()),
        n100: t.Optional(t.Numeric()),
        nKatu: t.Optional(t.Numeric()),
        n50: t.Optional(t.Numeric()),
        misses: t.Optional(t.Numeric()),
        legacyTotalScore: t.Optional(t.Numeric()),
        mode: t.Optional(t.Numeric()),
        mods: t.Optional(t.Numeric()),
        isScoreFailed: t.Optional(t.Boolean()),
        isPlayedOnLazer: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["Calculators"] },
    }, async ({
      CalculatorManagerInstance,
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
      set.headers["X-Rosu-Version"] = CalculatorManagerInstance.GetRosuVersion();

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
        = await CalculatorManagerInstance.CalculateScorePerformance(
          beatmapId,
          score,
          beatmapHash,
        );

      return results;
    });

  return app;
};
