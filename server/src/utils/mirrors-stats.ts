import { TimeRange } from '../types/stats';
import { MirrorClient } from '../core/abstracts/client/base-client.types';
import { getUTCDate } from './date';

export const APPLICATION_START_TIME =
    getUTCDate().getTime() - Bun.nanoseconds() / 1000000;

const MINUTE = 1000 * 60;

export const TIME_RANGES_FOR_MIRRORS_STATS = [
    {
        time: null,
        name: TimeRange.Lifetime,
    },
    {
        time: new Date(APPLICATION_START_TIME).toISOString(),
        name: TimeRange.Session,
    },
    {
        time: new Date(APPLICATION_START_TIME - MINUTE * 60).toISOString(),
        name: TimeRange.Hour,
    },
    {
        time: new Date(APPLICATION_START_TIME - MINUTE * 60 * 24).toISOString(),
        name: TimeRange.Day,
    },
    {
        time: new Date(
            APPLICATION_START_TIME - MINUTE * 60 * 24 * 7,
        ).toISOString(),
        name: TimeRange.Week,
    },
    {
        time: new Date(
            APPLICATION_START_TIME - MINUTE * 60 * 24 * 30,
        ).toISOString(),
        name: TimeRange.Month,
    },
];

const successfulStatusCodes = [200, 404];
const failedStatusCodes = [500, 502, 503, 504, 429];

export function getMirrorsRequestsQueryData(clients: MirrorClient[]) {
    return clients
        .flatMap((c) => {
            return TIME_RANGES_FOR_MIRRORS_STATS.map(({ time }) => time).map(
                (createdAfter) => [
                    {
                        baseUrl: c.client.clientConfig.baseUrl,
                        createdAfter,
                        statusCodes: successfulStatusCodes,
                    },
                    {
                        baseUrl: c.client.clientConfig.baseUrl,
                        createdAfter,
                        statusCodes: failedStatusCodes,
                    },
                    {
                        baseUrl: c.client.clientConfig.baseUrl,
                        createdAfter,
                    },
                ],
            );
        })
        .flat();
}
