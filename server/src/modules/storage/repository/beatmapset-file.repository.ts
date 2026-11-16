import { db } from "@observatory/common/database/client";
import type { BeatmapsetFile, NewBeatmapsetFile } from "@observatory/common/database/schema";
import { beatmapsetsFiles } from "@observatory/common/database/schema";
import type { DownloadBeatmapSetOptions } from "@observatory/common/types/beatmap-query";
import { and, count, eq, inArray, sql } from "drizzle-orm";

export async function getBeatmapSetsFilesCount() {
  const entities = await db
    .select({ count: count() })
    .from(beatmapsetsFiles)
    .where(sql`${beatmapsetsFiles.validUntil}::timestamptz >= now()`);

  if (entities.length <= 0) {
    return 0;
  }

  return entities[0].count;
}

export async function getUnvalidBeatmapSetsFiles(limit: number) {
  return await db
    .select({ id: beatmapsetsFiles.id, path: beatmapsetsFiles.path })
    .from(beatmapsetsFiles)
    .where(sql`${beatmapsetsFiles.validUntil}::timestamptz < now()`)
    .limit(limit);
}

export async function getBeatmapSetFile(
  ctx: DownloadBeatmapSetOptions,
): Promise<BeatmapsetFile | null> {
  const entities = await db
    .select()
    .from(beatmapsetsFiles)
    .where(
      and(
        eq(beatmapsetsFiles.id, ctx.beatmapSetId),
        ctx.noVideo !== true
          ? eq(beatmapsetsFiles.noVideo, false)
          : undefined,
        sql`${beatmapsetsFiles.validUntil}::timestamptz >= now()`,
      ),
    );

  return entities[0] ?? null;
}

export async function createBeatmapsetFile(
  data: NewBeatmapsetFile,
): Promise<BeatmapsetFile> {
  const entities = await db
    .insert(beatmapsetsFiles)
    .values(data)
    .onConflictDoUpdate({
      target: [beatmapsetsFiles.id],
      set: data,
    })
    .returning();
  return entities[0];
}

export async function deleteBeatmapsetsFiles(ids: number[]) {
  await db.delete(beatmapsetsFiles).where(inArray(beatmapsetsFiles.id, ids));
}
