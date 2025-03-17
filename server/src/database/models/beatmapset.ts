import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from '../client';
import { beatmapsets, NewBeatmapset } from '../schema';
import { Beatmapset as BeatmapsetObject } from '../../types/general/beatmap';
import { Beatmapset as BeatmapsetDatabase } from '../schema';
import { RankStatus } from '../../types/general/rankStatus';
import { getUTCDate } from '../../utils/date';
import { createBeatmap, getBeatmapsBySetId } from './beatmap';

const ONE_DAY = 1000 * 60 * 60 * 24;

export async function getBeatmapSetCount() {
    const entities = await db
        .select({ count: count() })
        .from(beatmapsets)
        .where(
            gte(
                sql`cast(${beatmapsets.validUntil} as timestamp)`,
                sql`cast(${getUTCDate()} as timestamp)`,
            ),
        );

    if (entities.length <= 0) {
        return 0;
    }

    return entities[0].count;
}

export async function getBeatmapSetById(
    beatmapsetId: number,
): Promise<BeatmapsetObject | null> {
    const entities = await db
        .select()
        .from(beatmapsets)
        .where(
            and(
                eq(beatmapsets.id, beatmapsetId),
                gte(
                    sql`cast(${beatmapsets.validUntil} as timestamp)`,
                    sql`cast(${getUTCDate()} as timestamp)`,
                ),
            ),
        );

    if (entities.length === 0) {
        return null;
    }

    return await enrichWithBeatmaps(databaseToObject(entities[0]));
}

export async function createBeatmapset(
    obj: BeatmapsetObject,
): Promise<BeatmapsetDatabase> {
    const data: NewBeatmapset = objectToDatabase(obj);

    const createBeatmapsPromises = Array.from(
        [obj.beatmaps, obj.converts].flat(),
    ).map(async (b) => (b ? await createBeatmap(b) : null));

    await Promise.all(createBeatmapsPromises);

    const entities = await db
        .insert(beatmapsets)
        .values(data)
        .onConflictDoUpdate({
            target: [beatmapsets.id],
            set: data,
        })
        .returning();
    return entities[0];
}

async function enrichWithBeatmaps(
    obj: BeatmapsetObject,
): Promise<BeatmapsetObject> {
    const beatmaps = await getBeatmapsBySetId(obj.id, false);
    const convertedBeatmaps = await getBeatmapsBySetId(obj.id, true);

    return {
        ...obj,
        beatmaps: beatmaps ?? undefined,
        converts: convertedBeatmaps ?? undefined,
    };
}

function objectToDatabase(obj: BeatmapsetObject): BeatmapsetDatabase {
    const data: BeatmapsetDatabase = {
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
            getUTCDate().getTime() + getTTLBasedOnStatus(obj.status),
        ).toISOString(),
    };

    return data;
}

function databaseToObject(obj: BeatmapsetDatabase): BeatmapsetObject {
    const data: BeatmapsetObject = {
        ...obj,
        status: obj.status as RankStatus,
        ranked: obj.ranked,
        covers: JSON.parse(obj.covers),
        hype: JSON.parse(obj.hype ?? '{}'),
        nominations_summary: JSON.parse(obj.nominations_summary ?? '{}'),
        submitted_date: obj.submitted_date ?? undefined,
        availability: JSON.parse(obj.availability ?? '{}'),
        has_favourited: obj.has_favourited ?? undefined,
        current_nominations: JSON.parse(obj.current_nominations ?? '{}'),
        description: JSON.parse(obj.description ?? '{}'),
        genre: JSON.parse(obj.genre ?? '{}'),
        langauge: JSON.parse(obj.langauge ?? '{}'),
        pack_tags: obj.pack_tags ?? undefined,
        ratings: obj.ratings ?? undefined,
        related_users: JSON.parse(obj.related_users ?? '{}'),
        user: JSON.parse(obj.user ?? '{}'),
        bpm: obj.bpm ?? 0,
        legacy_thread_url: obj.legacy_thread_url ?? undefined,
        // @ts-ignore
        validUntil: undefined,
    };

    return data;
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
