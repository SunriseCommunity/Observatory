import { db } from "@observatory/common/database/client";
import type { Beatmap as BeatmapDatabase } from "@observatory/common/database/schema";
import { beatmaps } from "@observatory/common/database/schema";
import type { Beatmap as BeatmapObject } from "@observatory/common/types/beatmap";
import type { GameMode } from "@observatory/common/types/gameMode";
import { RankStatus } from "@observatory/common/types/rankStatus";
import { and, count, eq, getTableColumns, sql } from "drizzle-orm";

const ONE_DAY = 1000 * 60 * 60 * 24;

const excludedBeatmapColumns = Object.fromEntries(
  Object.entries(getTableColumns(beatmaps)).map(([key, column]) => [
    key,
    sql.raw(`excluded."${column.name}"`),
  ]),
);

function objectToDatabase(obj: BeatmapObject): BeatmapDatabase {
  return {
    ...obj,
    status: obj.status,
    ranked: obj.ranked,
    failtimes: JSON.stringify(obj.failtimes),
    bpm: obj.bpm ?? null,
    deleted_at: obj.deleted_at ?? null,
    checksum: obj.checksum ?? null,
    max_combo: obj.max_combo ?? null,
    validUntil: new Date(Date.now() + BeatmapRepository.getTTLBasedOnStatus(obj.status)).toISOString(),
  };
}

export abstract class BeatmapRepository {
  static async getCount() {
    const entities = await db
      .select({ count: count() })
      .from(beatmaps)
      .where(sql`${beatmaps.validUntil}::timestamptz >= now()`);

    if (entities.length <= 0) {
      return 0;
    }

    return entities[0].count;
  }

  static async getById(
    beatmapId: number,
  ): Promise<BeatmapObject | null> {
    const entities = await db
      .select()
      .from(beatmaps)
      .where(
        and(
          eq(beatmaps.id, beatmapId),
          eq(beatmaps.convert, false),
          sql`${beatmaps.validUntil}::timestamptz >= now()`,
        ),
      );

    if (entities.length === 0) {
      return null;
    }

    return BeatmapRepository.databaseToObject(entities[0]);
  }

  static async getByHash(
    beatmapHash: string,
  ): Promise<BeatmapObject | null> {
    const entities = await db
      .select()
      .from(beatmaps)
      .where(
        and(
          eq(beatmaps.checksum, beatmapHash),
          eq(beatmaps.convert, false),
          sql`${beatmaps.validUntil}::timestamptz >= now()`,
        ),
      );

    if (entities.length === 0) {
      return null;
    }

    return BeatmapRepository.databaseToObject(entities[0]);
  }

  static async createMany(objs: BeatmapObject[]) {
    if (objs.length === 0) {
      return;
    }

    await db
      .insert(beatmaps)
      .values(objs.map(obj => objectToDatabase(obj)))
      .onConflictDoUpdate({
        target: [beatmaps.id, beatmaps.mode],
        set: excludedBeatmapColumns,
      });
  }

  static databaseToObject(obj: BeatmapDatabase): BeatmapObject {
    return {
      ...obj,
      mode: obj.mode as GameMode,
      bpm: obj.bpm ?? 0,
      checksum: obj.checksum ?? undefined,
      max_combo: obj.max_combo ?? undefined,
      status: obj.status as RankStatus,
      ranked: obj.ranked,
      failtimes: JSON.parse(obj.failtimes ?? "{}"),
      // @ts-expect-error -- Will be set when enriching
      validUntil: undefined,
    };
  }

  static getTTLBasedOnStatus(status: RankStatus): number {
    switch (status) {
      case RankStatus.GRAVEYARD:
        return ONE_DAY * 7; // 7 days
      case RankStatus.PENDING:
      case RankStatus.QUALIFIED:
      case RankStatus.WIP:
        return 1000 * 60 * 5; // 5 minutes
      case RankStatus.APPROVED:
      case RankStatus.LOVED:
      case RankStatus.RANKED:
        return ONE_DAY * 30; // 30 days
      default:
        return -1;
    }
  }
}
