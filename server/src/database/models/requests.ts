import type { HttpStatusCode } from "axios";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "../client";
import type { NewRequest, Request } from "../schema";
import { requests } from "../schema";

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

export async function getMirrorsRequestsCountForStats(
  dataRequests: Array<{
    baseUrl: string;
    createdAfter: string | null;
    statusCodes?: HttpStatusCode[];
  }>,
) {
  const values = dataRequests
    .map(
      (_, i) =>
                `('${dataRequests[i].baseUrl}', ${dataRequests[i].createdAfter ? `'${dataRequests[i].createdAfter}'` : null}, ${dataRequests[i].statusCodes && (dataRequests[i].statusCodes?.length ?? 0) > 0 ? `ARRAY[${dataRequests[i].statusCodes}]` : null})`,
    )
    .join(", ");

  const entities = await db
    .execute<{
      name: string;
      createdafter: string | null;
      statuscodes: HttpStatusCode[] | null;
      count: number;
    }>(
            `
        WITH request_params (baseUrl, createdAfter, statusCodes) AS (
            VALUES ${values}
        )
        SELECT
            rp.baseUrl AS name,
            rp.createdAfter,
            rp.statusCodes,
            COUNT(r.*) AS count
        FROM request_params rp
        LEFT JOIN requests r
            ON r.base_url = rp.baseUrl
            AND (
                rp.createdAfter IS NULL
                OR cast(r.created_at as timestamp) >= cast(rp.createdAfter as timestamp)
            )
            AND (
                rp.statusCodes IS NULL
                OR r.status = ANY(rp.statusCodes)
            )
        GROUP BY rp.baseUrl, rp.createdAfter, rp.statusCodes
        ORDER BY rp.baseUrl, rp.createdAfter
    `,
    )
    .then(result => result.rows);

  return entities;
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
