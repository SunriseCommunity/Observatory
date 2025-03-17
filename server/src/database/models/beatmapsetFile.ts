import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { BeatmapsetFile, beatmapsetsFiles, NewBeatmapsetFile } from '../schema';
import { getUTCDate } from '../../utils/date';
import { DownloadBeatmapSetOptions } from '../../core/abstracts/client/base-client.types';

export async function getBeatmapSetsFilesCount() {
    const entities = await db
        .select({ count: count() })
        .from(beatmapsetsFiles)
        .where(
            gte(
                sql`cast(${beatmapsetsFiles.validUntil} as timestamp)`,
                sql`cast(${getUTCDate()} as timestamp)`,
            ),
        );

    if (entities.length <= 0) {
        return 0;
    }

    return entities[0].count;
}

export async function getUnvalidBeatmapSetsFiles(): Promise<BeatmapsetFile[]> {
    const entities = await db
        .select()
        .from(beatmapsetsFiles)
        .where(
            and(
                gte(
                    sql`cast(${getUTCDate()} as timestamp)`,
                    sql`cast(${beatmapsetsFiles.validUntil} as timestamp)`,
                ),
            ),
        );

    return entities ?? [];
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
                gte(
                    sql`cast(${beatmapsetsFiles.validUntil} as timestamp)`,
                    sql`cast(${getUTCDate()} as timestamp)`,
                ),
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

export async function deleteBeatmapsetsFiles(data: BeatmapsetFile[]) {
    await db.delete(beatmapsetsFiles).where(
        inArray(
            beatmapsetsFiles.id,
            data.map((s) => s.id),
        ),
    );
}
