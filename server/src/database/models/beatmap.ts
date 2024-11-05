import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../client';
import { beatmaps, NewBeatmap } from '../schema';
import { Beatmap as BeatmapObject } from '../../types/general/beatmap';
import { Beatmap as BeatmapDatabase } from '../schema';
import { RankStatus } from '../../types/general/rankStatus';
import { getUTCDate } from '../../utils/date';
import { GameMode } from '../../types/general/gameMode';

const ONE_DAY = 1000 * 60 * 60 * 24;

export async function getBeatmapById(
    beatmapId: number,
): Promise<BeatmapObject | null> {
    const entities = await db
        .select()
        .from(beatmaps)
        .where(
            and(
                eq(beatmaps.id, beatmapId),
                eq(beatmaps.convert, false),
                gte(
                    sql`cast(${beatmaps.validUntil} as timestamp)`,
                    sql`cast(${getUTCDate()} as timestamp)`,
                ),
            ),
        );

    if (entities.length === 0) {
        return null;
    }

    return databaseToObject(entities[0]);
}

export async function getBeatmapByHash(
    beatmapHash: string,
): Promise<BeatmapObject | null> {
    const entities = await db
        .select()
        .from(beatmaps)
        .where(
            and(
                eq(beatmaps.checksum, beatmapHash),
                eq(beatmaps.convert, false),
                gte(
                    sql`cast(${beatmaps.validUntil} as timestamp)`,
                    sql`cast(${getUTCDate()} as timestamp)`,
                ),
            ),
        );

    if (entities.length === 0) {
        return null;
    }

    return databaseToObject(entities[0]);
}

export async function getBeatmapsBySetId(
    beatmapSetId: number,
    convert: boolean = false,
): Promise<BeatmapObject[] | null> {
    const entities = await db
        .select()
        .from(beatmaps)
        .where(
            and(
                eq(beatmaps.beatmapset_id, beatmapSetId),
                eq(beatmaps.convert, convert),
                gte(
                    sql`cast(${beatmaps.validUntil} as timestamp)`,
                    sql`cast(${getUTCDate()} as timestamp)`,
                ),
            ),
        );

    if (entities.length === 0) {
        return null;
    }

    return entities.map((e) => databaseToObject(e));
}

export async function createBeatmap(
    obj: BeatmapObject,
): Promise<BeatmapDatabase> {
    const data: NewBeatmap = objectToDatabase(obj);

    const entities = await db
        .insert(beatmaps)
        .values(data)
        .onConflictDoUpdate({
            target: [beatmaps.id, beatmaps.mode],
            set: data,
        })
        .returning();
    return entities[0];
}

function objectToDatabase(obj: BeatmapObject): BeatmapDatabase {
    const data: BeatmapDatabase = {
        ...obj,
        status: obj.status,
        ranked: obj.ranked,
        failtimes: JSON.stringify(obj.failtimes),
        bpm: obj.bpm ?? null,
        deleted_at: obj.deleted_at ?? null,
        checksum: obj.checksum ?? null,
        max_combo: obj.max_combo ?? null,
        validUntil: new Date(
            getUTCDate().getTime() + getTTLBasedOnStatus(obj.status),
        ).toISOString(),
    };

    return data;
}

function databaseToObject(obj: BeatmapDatabase): BeatmapObject {
    return {
        ...obj,
        mode: obj.mode as GameMode,
        bpm: obj.bpm ?? 0,
        checksum: obj.checksum ?? undefined,
        max_combo: obj.max_combo ?? undefined,
        status: obj.status as RankStatus,
        ranked: obj.ranked,
        failtimes: JSON.parse(obj.failtimes ?? '{}'),
        // @ts-ignore
        validUntil: undefined,
    };
}

function getTTLBasedOnStatus(status: RankStatus): number {
    switch (status) {
        case RankStatus.GRAVEYARD:
            return ONE_DAY * 7; // 7 days
        case RankStatus.WIP || RankStatus.PENDING || RankStatus.QUALIFIED:
            return 1000 * 60 * 5; // 5 minutes
        case RankStatus.RANKED || RankStatus.APPROVED || RankStatus.LOVED:
            return ONE_DAY * 30; // 30 days
        default:
            return -1;
    }
}
