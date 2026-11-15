import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type { UserCompact } from "@observatory/common/types/user";

export interface MinoBeatmapset extends Beatmapset {
  beatmaps?: MinoBeatmap[];
  converts?: MinoBeatmap[];

  ratings?: number[];
  next_update?: number;
  last_checked?: number;
  has_favourited?: boolean;
  recent_favourites?: UserCompact[];
  rating?: number;
  /** number */
  last_updated: string;
}

export interface MinoBeatmap extends Beatmap {
  set?: null | MinoBeatmapset;
  last_checked?: number;
  /** number */
  last_updated: string;
}
