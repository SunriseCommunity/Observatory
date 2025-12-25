import type { Beatmap } from "../../../types/general/beatmap";

export interface DirectBeatmap extends Omit<Beatmap, "failtimes"> {}
