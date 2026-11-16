import { db } from "@observatory/common/database/client";
import type { NewRequest, Request } from "@observatory/common/database/schema";
import { requests } from "@observatory/common/database/schema";
import type { HttpStatusCode } from "axios";
import { and, eq, sql } from "drizzle-orm";

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

export async function getRequestsBenchmark(baseUrl: string, hours: number) {
  const succeeded = sql`${requests.status} < 400`;
  const isJson = sql`${requests.contentType} = 'application/json'`;
  const isNotJson = sql`${requests.contentType} is distinct from 'application/json'`;

  const [stats] = await db
    .select({
      total: sql<number>`(count(*))::int`,
      failed: sql<number>`(count(*) filter (where ${requests.status} >= 400 and ${requests.status} <> 404))::int`, // 404 is expected
      apiRequests: sql<number>`(count(*) filter (where ${succeeded} and ${isJson}))::int`,
      averageLatency: sql<number | null>`(avg(coalesce(${requests.latency}, 0)) filter (where ${succeeded} and ${isJson}))::float8`,
      downloadRequests: sql<number>`(count(*) filter (where ${succeeded} and ${isNotJson}))::int`,
      averageDownloadSpeed: sql<number | null>`(avg(coalesce(${requests.downloadSpeed}, 0)) filter (where ${succeeded} and ${isNotJson}))::float8`,
    })
    .from(requests)
    .where(and(
      eq(requests.baseUrl, baseUrl),
      sql`cast(${requests.createdAt} as timestamp) >= (now() - make_interval(hours => ${hours}))::timestamp`,
    ));

  return stats;
}

export async function createRequest(data: NewRequest): Promise<Request> {
  const entities = await db.insert(requests).values(data).returning();
  return entities[0];
}
