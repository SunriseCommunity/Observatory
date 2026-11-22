import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type { ResultWithStatus } from "@observatory/common/types/beatmap-query";

export type BeatmapWithSet = ResultWithStatus<Beatmap> & {
  beatmapset?: Beatmapset;
};
