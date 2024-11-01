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
    weight: real('weight').notNull().default(1),
    requestsProcessed: integer('requests_processed').notNull().default(0),
    requestsFailed: integer('requests_failed').notNull().default(0),
    requestsTotal: integer('requests_total').notNull().default(0),
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

export type Mirror = typeof mirrors.$inferSelect;
export type NewMirror = typeof mirrors.$inferInsert;

export type Benchmark = typeof benchmarks.$inferSelect;
export type NewBenchmark = typeof benchmarks.$inferInsert;
