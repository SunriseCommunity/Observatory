import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { NewRequest, Request, requests } from '../schema';
import { HttpStatusCode } from 'axios';

export async function getRequestsCount(
    baseUrl: string,
    createdAfter?: number,
    statusCodes?: HttpStatusCode[],
) {
    const entities = await db
        .select({ count: count() })
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
                statusCodes ? inArray(requests.status, statusCodes) : undefined,
            ),
        );

    if (entities.length <= 0) {
        return 0;
    }

    return entities[0].count;
}

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
