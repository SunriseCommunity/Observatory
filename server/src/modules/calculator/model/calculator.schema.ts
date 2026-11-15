import type { UnwrapModels } from "elysia";
import { t } from "elysia";

export const BeatmapByIdGet = {
  Params: t.Object({
    id: t.Numeric(),
  }),
  Query: t.Object({
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
};
export type BeatmapByIdGet = UnwrapModels<typeof BeatmapByIdGet>;

export const ScorePost = {
  Body: t.Object({
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
};
export type ScorePost = UnwrapModels<typeof ScorePost>;
