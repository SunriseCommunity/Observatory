import crypto from "node:crypto";

import { GameModBitwise } from "@observatory/common/types/gameMod";
import * as rosu from "rosu-pp-js";

import type { PerformanceResult, Score, ScoreShort } from "../model/calculator.model";

// rosu-pp-js only frees these through a FinalizationRegistry once the GC collects their small JS wrappers, so WASM memory
// settled near 20 MB under load instead of 2.4 MB. They are serialized before free() because a freed object cannot be
// serialized later, and the difficulty getter returns a fresh copy on every read, so that copy is freed as well.
function calculateAndFree(performance: rosu.Performance, beatmap: rosu.Beatmap): PerformanceResult {
  try {
    const attributes = performance.calculate(beatmap);

    try {
      const json = attributes.toJSON() as Omit<PerformanceResult, "difficulty"> & { difficulty: rosu.DifficultyAttributes };
      const { difficulty } = json;

      try {
        return { ...json, difficulty: difficulty.toJSON() as PerformanceResult["difficulty"] };
      }
      finally {
        difficulty.free();
      }
    }
    finally {
      attributes.free();
    }
  }
  finally {
    performance.free();
  }
}

export abstract class PerformanceHelper {
  static CalculateBeatmapPerfomance(
    beatmap: rosu.Beatmap,
    scores: ScoreShort[],
  ) {
    const results: PerformanceResult[] = [];

    for (const score of scores) {
      if (score.mode !== undefined && beatmap.mode !== score.mode) {
        beatmap.convert(score.mode, score.mods);
      }

      const performance = new rosu.Performance({
        accuracy: score.accuracy,
        mods: score.mods ?? GameModBitwise.NoMod,
        combo: score.combo,
        misses: score.misses,
        lazer: score.isLazer,
        hitresultPriority: score.isScoreFailed
          ? rosu.HitResultPriority.WorstCase
          : rosu.HitResultPriority.BestCase,
        hitresultGenerators: Array.from({ length: 4 }, () => rosu.HitResultGenerator.Closest),
      });

      results.push(calculateAndFree(performance, beatmap));
    }

    return results;
  }

  static CalculateScorePerfomance(beatmap: rosu.Beatmap, score: Score) {
    if (score.mode !== undefined && beatmap.mode !== score.mode) {
      beatmap.convert(score.mode, score.mods);
    }

    const isHitresultsProvided
      = score.n300 !== undefined
        || score.n100 !== undefined
        || score.n50 !== undefined
        || score.nGeki !== undefined
        || score.nKatu !== undefined;

    const hitresultPriority = isHitresultsProvided
      ? score.isScoreFailed
        ? rosu.HitResultPriority.WorstCase
        : rosu.HitResultPriority.BestCase
      : rosu.HitResultPriority.BestCase;

    const performance = new rosu.Performance({
      accuracy: score.accuracy,
      mods: score.mods ?? GameModBitwise.NoMod,
      combo: score.combo,
      n300: score.n300,
      nGeki: score.nGeki,
      n100: score.n100,
      nKatu: score.nKatu,
      n50: score.n50,
      misses: score.misses,
      legacyTotalScore: score.legacyTotalScore,
      hitresultPriority,
      lazer: score.isLazer,
      hitresultGenerators: Array.from({ length: 4 }, () => rosu.HitResultGenerator.Closest),
    });

    return calculateAndFree(performance, beatmap);
  }

  static ConvertBufferToBeatmap(buffer: ArrayBuffer) {
    return new rosu.Beatmap(new Uint8Array(buffer));
  }

  static GetHashOfOsuFile(arrayBuffer: ArrayBuffer) {
    const hash = crypto.createHash("md5");
    hash.update(new Uint8Array(arrayBuffer));
    return hash.digest("hex");
  }
}
