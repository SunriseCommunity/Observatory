import type { GameModBitwise } from "@observatory/common/types/gameMod";
import type * as rosu from "rosu-pp-js";

type WasmMethods = "free" | "toJSON" | "toString";

export type PerformanceResult = Omit<rosu.PerformanceAttributes, WasmMethods | "difficulty"> & {
  difficulty: Omit<rosu.DifficultyAttributes, WasmMethods>;
};

export interface Score extends ScoreShort {
  legacyTotalScore?: number;
  n300?: number;
  nGeki?: number;
  n100?: number;
  nKatu?: number;
  n50?: number;
}

export interface ScoreShort {
  accuracy?: number;
  mods?: GameModBitwise;
  mode?: rosu.GameMode;
  combo?: number;
  misses?: number;
  isScoreFailed: boolean;
  isLazer: boolean;
}
