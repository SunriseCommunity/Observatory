import type { Beatmap } from "@observatory/common/types/beatmap";

export interface DirectBeatmap extends Omit<Beatmap, "failtimes"> {}
