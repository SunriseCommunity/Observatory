import { db } from "@observatory/common/database/client";
import type { BeatmapOsuFile, NewBeatmapOsuFile } from "@observatory/common/database/schema";
import { beatmapOsuFiles } from "@observatory/common/database/schema";
import type { DownloadOsuBeatmap } from "@observatory/common/types/beatmap-query";
import { and, count, eq, inArray, sql } from "drizzle-orm";

export abstract class BeatmapOsuFileRepository {
  static async getCount() {
    const entities = await db
      .select({ count: count() })
      .from(beatmapOsuFiles)
      .where(sql`${beatmapOsuFiles.validUntil}::timestamptz >= now()`);

    if (entities.length <= 0) {
      return 0;
    }

    return entities[0].count;
  }

  static async getUnvalid(limit: number) {
    return await db
      .select({ id: beatmapOsuFiles.id, path: beatmapOsuFiles.path })
      .from(beatmapOsuFiles)
      .where(sql`${beatmapOsuFiles.validUntil}::timestamptz < now()`)
      .limit(limit);
  }

  static async get(
    ctx: DownloadOsuBeatmap,
  ): Promise<BeatmapOsuFile | null> {
    const entities = await db
      .select()
      .from(beatmapOsuFiles)
      .where(
        and(
          eq(beatmapOsuFiles.id, ctx.beatmapId),
          sql`${beatmapOsuFiles.validUntil}::timestamptz >= now()`,
        ),
      );

    return entities[0] ?? null;
  }

  static async create(
    data: NewBeatmapOsuFile,
  ): Promise<BeatmapOsuFile> {
    const entities = await db
      .insert(beatmapOsuFiles)
      .values(data)
      .onConflictDoUpdate({
        target: [beatmapOsuFiles.id],
        set: data,
      })
      .returning();
    return entities[0];
  }

  static async deleteMany(ids: number[]) {
    await db.delete(beatmapOsuFiles).where(inArray(beatmapOsuFiles.id, ids));
  }
}
