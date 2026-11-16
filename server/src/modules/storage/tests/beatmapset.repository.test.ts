import { db } from "@observatory/common/database/client";
import { beatmaps, beatmapsets } from "@observatory/common/database/schema";
import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import { GameMode, GameModeInt } from "@observatory/common/types/gameMode";
import { RankStatus, RankStatusInt } from "@observatory/common/types/rankStatus";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";

import {
  createBeatmapset,
  deleteUnvalidBeatmapSets,
  getBeatmapSetById,
  getBeatmapSetsByBeatmapIds,
} from "../repository/beatmapset.repository";

const SET_ID = 2_100_000_000;
const EXPIRED = new Date(Date.now() - 60_000).toISOString();

function createTestBeatmap(id: number, overrides: Partial<Beatmap> = {}): Beatmap {
  return {
    beatmapset_id: SET_ID,
    difficulty_rating: 1,
    id,
    mode: GameMode.OSU_STANDARD,
    status: RankStatus.RANKED,
    total_length: 60,
    user_id: 1,
    version: `diff ${id}`,
    accuracy: 5,
    ar: 5,
    bpm: 120,
    convert: false,
    count_circles: 1,
    count_sliders: 1,
    count_spinners: 0,
    cs: 4,
    drain: 5,
    hit_length: 60,
    is_scoreable: true,
    last_updated: "2026-01-01T00:00:00Z",
    mode_int: GameModeInt.OSU_STANDARD,
    passcount: 0,
    playcount: 0,
    ranked: RankStatusInt.RANKED,
    url: "",
    ...overrides,
  };
}

function createTestBeatmapset(): Beatmapset {
  return {
    id: SET_ID,
    artist: "artist",
    artist_unicode: "artist",
    creator: "creator",
    source: "",
    tags: "",
    title: "title",
    title_unicode: "title",
    covers: {} as Beatmapset["covers"],
    favourite_count: 0,
    hype: {},
    nsfw: false,
    offset: 0,
    play_count: 0,
    preview_url: "",
    spotlight: false,
    status: RankStatus.RANKED,
    user_id: 1,
    video: false,
    bpm: 120,
    can_be_hyped: false,
    discussion_enabled: true,
    discussion_locked: false,
    is_scoreable: true,
    last_updated: "2026-01-01T00:00:00Z",
    nominations_summary: {},
    ranked: RankStatusInt.RANKED,
    storyboard: false,
    availability: { download_disabled: false },
    related_tags: undefined,
    beatmaps: [createTestBeatmap(SET_ID + 1), createTestBeatmap(SET_ID + 2)],
    converts: [
      createTestBeatmap(SET_ID + 1, {
        convert: true,
        mode: GameMode.OSU_TAIKO,
        mode_int: GameModeInt.OSU_TAIKO,
      }),
    ],
  };
}

async function removeTestRows() {
  await db.delete(beatmaps).where(eq(beatmaps.beatmapset_id, SET_ID));
  await db.delete(beatmapsets).where(eq(beatmapsets.id, SET_ID));
}

describe("beatmapset repository", () => {
  beforeEach(async () => {
    await removeTestRows();
    await createBeatmapset(createTestBeatmapset());
  });

  afterAll(removeTestRows);

  it("returns each whole set once for beatmap ids from the same set", async () => {
    const result = await getBeatmapSetsByBeatmapIds([SET_ID + 1, SET_ID + 2]);

    expect(result.map(set => set.id)).toEqual([SET_ID]);
    expect(result[0].beatmaps?.map(b => b.id).sort()).toEqual([SET_ID + 1, SET_ID + 2]);
    expect(result[0].converts?.map(b => b.mode)).toEqual([GameMode.OSU_TAIKO]);
  });

  it("returns all beatmaps of the set when only one of them is requested", async () => {
    const [set] = await getBeatmapSetsByBeatmapIds([SET_ID + 2]);

    expect(set.beatmaps).toHaveLength(2);
    expect(set.converts).toHaveLength(1);
  });

  it("skips sets that are no longer valid", async () => {
    await db.update(beatmapsets).set({ validUntil: EXPIRED }).where(eq(beatmapsets.id, SET_ID));

    expect(await getBeatmapSetsByBeatmapIds([SET_ID + 1])).toEqual([]);
    expect(await getBeatmapSetById(SET_ID)).toBeNull();
  });

  it("skips sets with an expired beatmap", async () => {
    await db
      .update(beatmaps)
      .set({ validUntil: EXPIRED })
      .where(and(eq(beatmaps.id, SET_ID + 2), eq(beatmaps.mode, GameMode.OSU_STANDARD)));

    expect(await getBeatmapSetsByBeatmapIds([SET_ID + 1])).toEqual([]);
    expect(await getBeatmapSetById(SET_ID)).toBeNull();
  });

  it("deletes expired sets together with their beatmaps", async () => {
    await db.update(beatmapsets).set({ validUntil: EXPIRED }).where(eq(beatmapsets.id, SET_ID));

    expect(await deleteUnvalidBeatmapSets()).toBeGreaterThanOrEqual(1);

    expect(await db.select().from(beatmapsets).where(eq(beatmapsets.id, SET_ID))).toEqual([]);
    expect(
      await db.select().from(beatmaps).where(inArray(beatmaps.id, [SET_ID + 1, SET_ID + 2])),
    ).toEqual([]);
  });
});
