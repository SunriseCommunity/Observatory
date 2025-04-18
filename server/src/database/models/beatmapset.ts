import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from '../client';
import { beatmaps, beatmapsets, NewBeatmapset } from '../schema';
import {
    Beatmapset as BeatmapsetObject,
    Beatmap as BeatmapObject,
} from '../../types/general/beatmap';

import { databaseToObject as beatmapDatabaseToObject } from './beatmap';
import { Beatmapset as BeatmapsetDatabase } from '../schema';
import { RankStatus } from '../../types/general/rankStatus';
import { getUTCDate } from '../../utils/date';
import { createBeatmap } from './beatmap';
import { splitByCondition } from '../../utils/array';

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
        )
        .innerJoin(beatmaps, eq(beatmapsets.id, beatmaps.beatmapset_id));

    if (entities.length === 0) {
        return null;
    }

    const result = {
        beatmapsets: entities[0].beatmapsets,
        beatmaps: entities.map((e) => e.beatmaps),
    };

    if (
        result.beatmaps.some(
            (b) => Date.parse(b.validUntil) < getUTCDate().getTime(),
        )
    ) {
        return null;
    }

    return await enrichWithBeatmaps(
        databaseToObject(result.beatmapsets),
        result.beatmaps.map((b) => beatmapDatabaseToObject(b)),
    );
}

export async function createBeatmapset(
    obj: BeatmapsetObject,
): Promise<BeatmapsetDatabase> {
    const data: NewBeatmapset = objectToDatabase(obj);

    const createBeatmapsPromises = Array.from(
        [obj.beatmaps, obj.converts].flat(),
    ).map(async (b) => (b ? await createBeatmap(b) : null));

    await Promise.all(createBeatmapsPromises);

    data.validUntil = getValidUntilBasedOnBeatmapsTTL(
        [obj.beatmaps ?? [], obj.converts ?? []].flat(),
    );

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
    beatmapset: BeatmapsetObject,
    beatmaps: BeatmapObject[],
): Promise<BeatmapsetObject> {
    const [convertedBeatmaps, defaultBeatmaps] = splitByCondition(
        beatmaps,
        (b) => b.convert,
    );

    return {
        ...beatmapset,
        beatmaps: defaultBeatmaps ?? undefined,
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
        related_tags: undefined,
        // @ts-ignore
        validUntil: undefined,
    };

    return data;
}

function getTTLBasedOnStatus(status: RankStatus): number {
    switch (status) {
        case RankStatus.GRAVEYARD:
            return ONE_DAY * 7; // 7 days
        case RankStatus.PENDING:
        case RankStatus.WIP:
        case RankStatus.QUALIFIED:
            return 1000 * 60 * 5; // 5 minutes
        case RankStatus.APPROVED:
        case RankStatus.LOVED:
        case RankStatus.RANKED:
            return ONE_DAY * 30; // 30 days
        default:
            return -1;
    }
}

function getValidUntilBasedOnBeatmapsTTL(beatmaps: BeatmapObject[]): string {
    return new Date(
        getUTCDate().getTime() +
            getLowestTTLBasedOnStatuses(beatmaps.map((b) => b.status)),
    ).toISOString();
}

function getLowestTTLBasedOnStatuses(statuses: RankStatus[]): number {
    if (statuses.length === 0) return 0;

    return statuses
        .map((status) => getTTLBasedOnStatus(status))
        .sort((a, b) => a - b)[0];
}
