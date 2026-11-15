import { db } from "@observatory/common/database/client";
import type { BeatmapOsuFile, NewBeatmapOsuFile } from "@observatory/common/database/schema";
import { beatmapOsuFiles } from "@observatory/common/database/schema";
import type { DownloadOsuBeatmap } from "@observatory/common/types/beatmap-query";
import { getUTCDate } from "@observatory/common/utilities/date";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";

export async function getBeatmapOsuFileCount() {
  const entities = await db
    .select({ count: count() })
    .from(beatmapOsuFiles)
    .where(
      gte(
        sql`cast(${beatmapOsuFiles.validUntil} as timestamp)`,
        sql`cast(${getUTCDate()} as timestamp)`,
      ),
    );

  if (entities.length <= 0) {
    return 0;
  }

  return entities[0].count;
}

export async function getUnvalidBeatmapOsuFiles(): Promise<BeatmapOsuFile[]> {
  const entities = await db
    .select()
    .from(beatmapOsuFiles)
    .where(
      and(
        gte(
          sql`cast(${getUTCDate()} as timestamp)`,
          sql`cast(${beatmapOsuFiles.validUntil} as timestamp)`,
        ),
      ),
    );

  return entities ?? [];
}

export async function getBeatmapOsuFile(
  ctx: DownloadOsuBeatmap,
): Promise<BeatmapOsuFile | null> {
  const entities = await db
    .select()
    .from(beatmapOsuFiles)
    .where(
      and(
        eq(beatmapOsuFiles.id, ctx.beatmapId),
        gte(
          sql`cast(${beatmapOsuFiles.validUntil} as timestamp)`,
          sql`cast(${getUTCDate()} as timestamp)`,
        ),
      ),
    );

  return entities[0] ?? null;
}

export async function createBeatmapOsuFile(
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

export async function deleteBeatmapsOsuFiles(data: BeatmapOsuFile[]) {
  await db.delete(beatmapOsuFiles).where(
    inArray(
      beatmapOsuFiles.id,
      data.map(s => s.id),
    ),
  );
}
