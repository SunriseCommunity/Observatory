import { sql } from 'drizzle-orm';
import {
    pgTable,
    text,
    serial,
    integer,
    real,
    boolean,
    primaryKey,
} from 'drizzle-orm/pg-core';

const timestamps = {
    updatedAt: text('updated_at')
        .default(sql`now()::timestamp without time zone`)
        .notNull(),
    createdAt: text('created_at')
        .default(sql`now()::timestamp without time zone`)
        .notNull(),
    deletedAt: text('deleted_at'),
};

const validTimestamps = {
    validUntil: text('valid_until').notNull(),
};

export const mirrors = pgTable('mirrors', {
    mirrorId: serial('mirror_id').primaryKey(),
    url: text('url').notNull(),
    ...timestamps,
});

export const requests = pgTable('requests', {
    requestId: serial('request_id').primaryKey(),
    baseUrl: text('base_url').notNull(),
    url: text('endpoint').notNull(),
    method: text('method').notNull(),
    contentType: text('content_type'),
    downloadSpeed: integer('download_speed'),
    status: integer('status').notNull(),
    latency: integer('latency'),
    data: text('data'),
    ...timestamps,
});

export const beatmapsets = pgTable('beatmapsets', {
    id: integer('id').primaryKey(),
    artist: text('artist').notNull(),
    artist_unicode: text('artist_unicode').notNull(),
    creator: text('creator').notNull(),
    source: text('source').notNull(),
    tags: text('tags').notNull(),
    title: text('title').notNull(),
    title_unicode: text('title_unicode').notNull(),
    /** JSON */
    covers: text('covers').notNull(),
    favourite_count: integer('favourite_count').notNull(),
    hype: text('hype'),
    nsfw: boolean('nsfw').notNull(),
    offset: integer('offset').notNull(),
    play_count: integer('play_count').notNull(),
    preview_url: text('preview_url').notNull(),
    spotlight: boolean('spotlight').notNull(),
    status: text('status').notNull(),
    track_id: integer('track_id'),
    user_id: integer('user_id').notNull(),
    video: boolean('video').notNull(),
    bpm: real('bpm'),
    can_be_hyped: boolean('can_be_hyped').notNull(),
    deleted_at: text('deleted_at'),
    discussion_enabled: boolean('discussion_enabled').notNull(),
    discussion_locked: boolean('discussion_locked').notNull(),
    is_scoreable: boolean('is_scoreable').notNull(),
    last_updated: text('last_updated').notNull(),
    legacy_thread_url: text('legacy_thread_url'),
    /** JSON */
    nominations_summary: text('nominations_summary'),
    ranked: integer('ranked').notNull(),
    ranked_date: text('ranked_date'),
    storyboard: boolean('storyboard').notNull(),
    submitted_date: text('submitted_date'),
    /** JSON */
    availability: text('availability'),
    has_favourited: boolean('has_favourited'),
    /** JSON */
    current_nominations: text('current_nominations'),
    /** JSON */
    description: text('description'),
    /** JSON */
    genre: text('genre'),
    /** JSON */
    langauge: text('langauge'),
    pack_tags: text('pack_tags')
        .array()
        .default(sql`'{}'::text[]`),
    ratings: integer('ratings')
        .array()
        .default(sql`'{}'::int[]`),
    /** JSON */
    related_users: text('related_users'),
    /** JSON */
    user: text('user'),
    ...validTimestamps,
});

export const beatmapsetsFiles = pgTable('beatmapsets_files', {
    id: integer('id').primaryKey(),
    noVideo: boolean('no_video').notNull(),
    path: text('path').notNull(),
    ...timestamps,
    ...validTimestamps,
});

export const beatmapOsuFiles = pgTable('beatmap_osu_files', {
    id: integer('id').primaryKey(),
    path: text('path').notNull(),
    ...timestamps,
    ...validTimestamps,
});

export const beatmaps = pgTable(
    'beatmaps',
    {
        beatmapset_id: integer('beatmapset_id').notNull(),
        difficulty_rating: real('difficulty_rating').notNull(),
        id: integer('id').notNull(),
        mode: text('mode').notNull(),
        status: text('status').notNull(),
        total_length: integer('total_length').notNull(),
        user_id: integer('user_id').notNull(),
        version: text('version').notNull(),
        accuracy: real('accuracy').notNull(),
        ar: real('ar').notNull(),
        bpm: real('bpm'),
        convert: boolean('convert').notNull(),
        count_circles: integer('count_circles').notNull(),
        count_sliders: integer('count_sliders').notNull(),
        count_spinners: integer('count_spinners').notNull(),
        cs: real('cs').notNull(),
        deleted_at: text('deleted_at'),
        drain: real('drain').notNull(),
        hit_length: integer('hit_length').notNull(),
        is_scoreable: boolean('is_scoreable').notNull(),
        last_updated: text('last_updated').notNull(),
        mode_int: integer('mode_int').notNull(),
        passcount: integer('passcount').notNull(),
        playcount: integer('playcount').notNull(),
        ranked: integer('ranked').notNull(),
        url: text('url').notNull(),
        checksum: text('checksum'),
        /** JSON */
        failtimes: text('failtimes'),
        max_combo: integer('max_combo'),
        ...validTimestamps,
    },
    (beatmaps) => ({
        pk: primaryKey({ columns: [beatmaps.id, beatmaps.mode] }),
    }),
);

export type Beatmapset = typeof beatmapsets.$inferSelect;
export type NewBeatmapset = typeof beatmapsets.$inferInsert;

export type Beatmap = typeof beatmaps.$inferSelect;
export type NewBeatmap = typeof beatmaps.$inferInsert;

export type BeatmapsetFile = typeof beatmapsetsFiles.$inferSelect;
export type NewBeatmapsetFile = typeof beatmapsetsFiles.$inferInsert;

export type BeatmapOsuFile = typeof beatmapOsuFiles.$inferSelect;
export type NewBeatmapOsuFile = typeof beatmapOsuFiles.$inferInsert;

export type Mirror = typeof mirrors.$inferSelect;
export type NewMirror = typeof mirrors.$inferInsert;

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
