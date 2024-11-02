import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../client';
import { NewRequest, Request, requests } from '../schema';

export async function getRequestsByBaseUrl(
    baseUrl: string,
    createdAfter: number,
): Promise<Request[]> {
    const entities = await db
        .select()
        .from(requests)
        .where(
            and(
                eq(requests.baseUrl, baseUrl),
                createdAfter
                    ? gte(
                          sql`cast(${requests.createdAt} as timestamp)`,
                          sql`cast(${new Date(createdAfter)} as timestamp)`,
                      )
                    : undefined,
            ),
        );
    return entities ?? [];
}

export async function createRequest(data: NewRequest): Promise<Request> {
    const entities = await db.insert(requests).values(data).returning();
    return entities[0];
}
