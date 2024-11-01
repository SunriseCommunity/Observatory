import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../client';
import { Benchmark, benchmarks, NewBenchmark } from '../schema';
import { getUTCDate } from '../../utils/date';

const ONE_HOUR = 1000 * 60 * 60;

export async function getBenchmarkByMirrorId(
    mirrorId: number,
    shouldBeValid = true,
): Promise<Benchmark | null> {
    const benchmark = await db
        .select()
        .from(benchmarks)
        .where(
            and(
                eq(benchmarks.mirrorId, mirrorId),
                shouldBeValid
                    ? gte(
                          sql`cast(${benchmarks.updatedAt} as timestamp)`,
                          sql`cast(${new Date(
                              getUTCDate().getTime() - ONE_HOUR,
                          )} as timestamp)`,
                      )
                    : undefined,
            ),
        );

    return benchmark[0] ?? null;
}

export async function updateBenchmark(
    mirrorId: number,
    data: Partial<NewBenchmark>,
): Promise<void> {
    await db
        .update(benchmarks)
        .set(data)
        .where(eq(benchmarks.mirrorId, mirrorId));
}

export async function createBenchmark(data: NewBenchmark): Promise<Benchmark> {
    const benchmark = await db.insert(benchmarks).values(data).returning();
    return benchmark[0];
}
