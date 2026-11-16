import { db } from "@observatory/common/database/client";
import type { Beatmapset as BeatmapsetDatabase, NewBeatmapset } from "@observatory/common/database/schema";
import { beatmaps, beatmapsets } from "@observatory/common/database/schema";
import type {
  Beatmap as BeatmapObject,
  Beatmapset as BeatmapsetObject,
} from "@observatory/common/types/beatmap";
import type { RankStatus } from "@observatory/common/types/rankStatus";
import { splitByCondition } from "@observatory/common/utilities/array";
import type { SQL } from "drizzle-orm";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import { createBeatmaps, databaseToObject as beatmapDatabaseToObject, getTTLBasedOnStatus } from "./beatmap.repository";

const isBeatmapsetValid = sql`${beatmapsets.validUntil}::timestamptz >= now()`;

export async function getBeatmapSetCount() {
  const entities = await db
    .select({ count: count() })
    .from(beatmapsets)
    .where(isBeatmapsetValid);

  if (entities.length <= 0) {
    return 0;
  }

  return entities[0].count;
}

export async function deleteUnvalidBeatmapSets(): Promise<number> {
  // now() is fixed for the whole transaction, so both deletes see the same expired sets
  return await db.transaction(async (tx) => {
    const isExpired = sql`${beatmapsets.validUntil}::timestamptz < now()`;

    await tx.delete(beatmaps).where(
      inArray(
        beatmaps.beatmapset_id,
        tx.select({ id: beatmapsets.id }).from(beatmapsets).where(isExpired),
      ),
    );

    const { rowCount } = await tx.delete(beatmapsets).where(isExpired);
    return rowCount ?? 0;
  });
}

export async function getBeatmapSetById(
  beatmapsetId: number,
): Promise<BeatmapsetObject | null> {
  const [beatmapset] = await getValidBeatmapSets(eq(beatmapsets.id, beatmapsetId));

  return beatmapset ?? null;
}

export async function getBeatmapSetsByBeatmapIds(
  beatmapIds: number[],
): Promise<BeatmapsetObject[]> {
  return await getValidBeatmapSets(
    inArray(
      beatmapsets.id,
      db
        .select({ id: beatmaps.beatmapset_id })
        .from(beatmaps)
        .where(inArray(beatmaps.id, beatmapIds)),
    ),
  );
}

export async function createBeatmapset(obj: BeatmapsetObject) {
  const setBeatmaps = [...(obj.beatmaps ?? []), ...(obj.converts ?? [])];
  const data: NewBeatmapset = objectToDatabase(obj, setBeatmaps);

  await createBeatmaps(setBeatmaps);

  await db
    .insert(beatmapsets)
    .values(data)
    .onConflictDoUpdate({
      target: [beatmapsets.id],
      set: data,
    });
}

// Whole sets with all their beatmaps and converts; a set with any expired beatmap counts as missing
async function getValidBeatmapSets(
  where: SQL,
): Promise<BeatmapsetObject[]> {
  const entities = await db
    .select()
    .from(beatmapsets)
    .innerJoin(beatmaps, eq(beatmapsets.id, beatmaps.beatmapset_id))
    .where(and(where, isBeatmapsetValid));

  const sets = new Map<number, { beatmapset: BeatmapsetDatabase; beatmaps: BeatmapObject[]; expired: boolean }>();

  for (const entity of entities) {
    const set = sets.get(entity.beatmapsets.id)
      ?? { beatmapset: entity.beatmapsets, beatmaps: [], expired: false };

    set.beatmaps.push(beatmapDatabaseToObject(entity.beatmaps));
    set.expired ||= Date.parse(entity.beatmaps.validUntil) < Date.now();
    sets.set(entity.beatmapsets.id, set);
  }

  return [...sets.values()]
    .filter(set => !set.expired)
    .map(set => enrichWithBeatmaps(databaseToObject(set.beatmapset), set.beatmaps));
}

function enrichWithBeatmaps(
  beatmapset: BeatmapsetObject,
  beatmaps: BeatmapObject[],
): BeatmapsetObject {
  const [convertedBeatmaps, defaultBeatmaps] = splitByCondition(
    beatmaps,
    b => b.convert,
  );

  return {
    ...beatmapset,
    beatmaps: defaultBeatmaps ?? undefined,
    converts: convertedBeatmaps ?? undefined,
  };
}

function objectToDatabase(obj: BeatmapsetObject, setBeatmaps: BeatmapObject[]): BeatmapsetDatabase {
  return {
    ...obj,
    status: obj.status,
    ranked: obj.ranked,
    bpm: obj.bpm ?? null,
    deleted_at: obj.deleted_at ?? null,
    covers: JSON.stringify(obj.covers),
    hype: JSON.stringify(obj.hype),
    track_id: obj.track_id ?? null,
    legacy_thread_url: obj.legacy_thread_url ?? null,
    nominations_summary: JSON.stringify(obj.nominations_summary),
    ranked_date: obj.ranked_date ?? null,
    submitted_date: obj.submitted_date ?? null,
    availability: JSON.stringify(obj.availability),
    has_favourited: obj.has_favourited ?? null,
    current_nominations: JSON.stringify(obj.current_nominations),
    description: JSON.stringify(obj.description),
    genre: JSON.stringify(obj.genre),
    langauge: JSON.stringify(obj.langauge),
    pack_tags: obj.pack_tags ?? null,
    ratings: obj.ratings ?? null,
    related_users: JSON.stringify(obj.related_users),
    user: JSON.stringify(obj.user),
    validUntil: new Date(
      Date.now() + getLowestTTLBasedOnStatuses(setBeatmaps.map(b => b.status)),
    ).toISOString(),
  };
}

function databaseToObject(obj: BeatmapsetDatabase): BeatmapsetObject {
  const data: BeatmapsetObject = {
    ...obj,
    status: obj.status as RankStatus,
    ranked: obj.ranked,
    covers: JSON.parse(obj.covers),
    hype: JSON.parse(obj.hype ?? "{}"),
    nominations_summary: JSON.parse(obj.nominations_summary ?? "{}"),
    submitted_date: obj.submitted_date ?? undefined,
    availability: JSON.parse(obj.availability ?? "{}"),
    has_favourited: obj.has_favourited ?? undefined,
    current_nominations: JSON.parse(obj.current_nominations ?? "[]"),
    description: JSON.parse(obj.description ?? "{}"),
    genre: JSON.parse(obj.genre ?? "{}"),
    langauge: JSON.parse(obj.langauge ?? "{}"),
    pack_tags: obj.pack_tags ?? undefined,
    ratings: obj.ratings ?? undefined,
    related_users: JSON.parse(obj.related_users ?? "[]"),
    user: JSON.parse(obj.user ?? "{}"),
    bpm: obj.bpm ?? 0,
    legacy_thread_url: obj.legacy_thread_url ?? undefined,
    related_tags: undefined,
    // @ts-expect-error -- Will be set when enriching
    validUntil: undefined,
  };

  return data;
}

function getLowestTTLBasedOnStatuses(statuses: RankStatus[]): number {
  if (statuses.length === 0)
    return 0;

  return Math.min(...statuses.map(status => getTTLBasedOnStatus(status)));
}
