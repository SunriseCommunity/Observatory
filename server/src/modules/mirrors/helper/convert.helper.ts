import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";

import type {
  MinoBeatmap,
  MinoBeatmapset,
} from "../clients/catboy.best/mino-client.types";
import type { DirectBeatmap } from "../clients/osu.direct/direct-client.types";
import type {
  BanchoBeatmap,
  BanchoBeatmapset,
} from "../clients/osu.ppy.sh/bancho-client.types";

export function convertBanchoBeatmapset(beatmapset: BanchoBeatmapset): Beatmapset {
  delete beatmapset.current_user_attributes;
  delete beatmapset.recent_favourites;
  delete beatmapset.discussions;
  delete beatmapset.events;
  delete beatmapset.related_tags;

  return {
    ...beatmapset,
    beatmaps: beatmapset.beatmaps?.map(convertBanchoBeatmap),
    converts: beatmapset.converts?.map(convertBanchoBeatmap),
  } as Beatmapset;
}

export function convertBanchoBeatmap(beatmap: BanchoBeatmap): Beatmap {
  delete beatmap.beatmapset;
  delete beatmap.owners;

  return {
    ...beatmap,
  } as Beatmap;
}

export function convertDirectBeatmap(beatmap: DirectBeatmap): Beatmap {
  return {
    ...beatmap,
    failtimes: {
      fail: Array.from<number>({ length: 100 }).fill(0),
      exit: Array.from<number>({ length: 100 }).fill(0),
    },
  };
}

export function convertMinoBeatmap(beatmap: MinoBeatmap): Beatmap {
  delete beatmap.set;
  delete beatmap.last_checked;
  delete beatmap.owners;
  delete beatmap.current_user_tag_ids;
  delete beatmap.top_tag_ids;

  return {
    ...beatmap,
    last_updated: new Date(beatmap.last_updated).toISOString(),
  } as Beatmap;
}

export function convertMinoBeatmapset(beatmapset: MinoBeatmapset): Beatmapset {
  delete beatmapset.next_update;
  delete beatmapset.last_checked;
  delete beatmapset.has_favourited;
  delete beatmapset.recent_favourites;
  delete beatmapset.related_tags;
  delete beatmapset.rating;

  return {
    ...beatmapset,
    last_updated: new Date(beatmapset.last_updated).toISOString(),
    beatmaps: beatmapset.beatmaps?.map(convertMinoBeatmap),
    converts: beatmapset.converts?.map(convertMinoBeatmap),
  } as Beatmapset;
}
