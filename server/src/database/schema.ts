import { sql } from 'drizzle-orm';
import { pgTable, text, serial, integer, real } from 'drizzle-orm/pg-core';

const timestamps = {
    updatedAt: text('updated_at')
        .default(sql`now()::timestamp without time zone`)
        .notNull(),
    createdAt: text('created_at')
        .default(sql`now()::timestamp without time zone`)
        .notNull(),
    deletedAt: text('deleted_at'),
};

export const mirrors = pgTable('mirrors', {
    mirrorId: serial('mirror_id').primaryKey(),
    url: text('url').notNull(),
    ...timestamps,
});

export const benchmarks = pgTable('benchmarks', {
    benchmarkId: serial('benchmark_id').primaryKey(),
    mirrorId: integer('mirror_id')
        .notNull()
        .references(() => mirrors.mirrorId),
    downloadSpeed: integer('download_speed'),
    APILatency: integer('api_latency').notNull().default(0),
    ...timestamps,
});

export const requests = pgTable('requests', {
    requestId: serial('request_id').primaryKey(),
    baseUrl: text('base_url').notNull(),
    url: text('endpoint').notNull(),
    method: text('method').notNull(),
    status: integer('status').notNull(),
    latency: integer('latency'),
    data: text('data'),
    ...timestamps,
});

export type Mirror = typeof mirrors.$inferSelect;
export type NewMirror = typeof mirrors.$inferInsert;

export type Benchmark = typeof benchmarks.$inferSelect;
export type NewBenchmark = typeof benchmarks.$inferInsert;

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
