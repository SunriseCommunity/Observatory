import type { Beatmap, Beatmapset } from "../../../types/general/beatmap";
import type { UserCompact } from "../../../types/general/user";

export interface OsulabsBeatmapset extends Beatmapset {
  beatmaps?: OsulabsBeatmap[];
  converts?: OsulabsBeatmap[];

  ratings?: number[];
  next_update?: number;
  last_checked?: number;
  has_favourited?: boolean;
  recent_favourites?: UserCompact[];
  rating?: number;
  /** number */
  last_updated: string;
}

export interface OsulabsBeatmap extends Beatmap {
  set?: null | OsulabsBeatmapset;
  last_checked?: number;
  /** number */
  last_updated: string;
}
