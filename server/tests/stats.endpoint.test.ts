import { beforeAll, beforeEach, describe, expect, jest, test } from 'bun:test';
import { Elysia } from 'elysia';
import { HttpStatusCode } from 'axios';
import { Mocker } from './utils/mocker';
import setup from '../src/setup';

describe('Stats Endpoint', () => {
    let app: Elysia;

    beforeAll(async () => {
        await Mocker.ensureDatabaseInitialized();
    });

    beforeEach(async () => {
        jest.restoreAllMocks();
        Mocker.mockMirrorsBenchmark();

        app = (await setup()) as unknown as Elysia;
    });

    test('Should return 200 status code', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        expect(response.status).toBe(HttpStatusCode.Ok);
    });

    test('Should return JSON response with server and manager stats', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        expect(response.status).toBe(HttpStatusCode.Ok);

        const data = await response.json();

        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('server');
        expect(data.data).toHaveProperty('manager');
    });

    test('Should include server statistics with correct structure', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const serverStats = data.data.server;

        expect(serverStats).toHaveProperty('uptime');
        expect(serverStats.uptime).toHaveProperty('nanoseconds');
        expect(serverStats.uptime).toHaveProperty('pretty');
        expect(typeof serverStats.uptime.nanoseconds).toBe('number');
        expect(typeof serverStats.uptime.pretty).toBe('string');

        expect(serverStats).toHaveProperty('memory');
        expect(serverStats.memory).toHaveProperty('rss');
        expect(serverStats.memory).toHaveProperty('heapTotal');
        expect(serverStats.memory).toHaveProperty('heapUsed');
        expect(serverStats.memory).toHaveProperty('external');
        expect(serverStats.memory).toHaveProperty('arrayBuffers');

        expect(serverStats).toHaveProperty('pid');
        expect(typeof serverStats.pid).toBe('number');

        expect(serverStats).toHaveProperty('version');
        expect(typeof serverStats.version).toBe('string');

        expect(serverStats).toHaveProperty('revision');
        expect(typeof serverStats.revision).toBe('string');
    });

    test('Should include manager statistics with correct structure', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const managerStats = data.data.manager;

        expect(managerStats).toHaveProperty('storage');
        expect(managerStats).toHaveProperty('mirrors');
    });

    test('Should include storage statistics with correct structure', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const storageStats = data.data.manager.storage;

        expect(storageStats).toHaveProperty('database');
        expect(storageStats.database).toHaveProperty('beatmaps');
        expect(storageStats.database).toHaveProperty('beatmapSets');
        expect(storageStats.database).toHaveProperty('beatmapSetFile');
        expect(storageStats.database).toHaveProperty('beatmapOsuFile');
        expect(typeof storageStats.database.beatmaps).toBe('number');
        expect(typeof storageStats.database.beatmapSets).toBe('number');
        expect(typeof storageStats.database.beatmapSetFile).toBe('number');
        expect(typeof storageStats.database.beatmapOsuFile).toBe('number');

        expect(storageStats).toHaveProperty('files');
        expect(storageStats.files).toHaveProperty('totalFiles');
        expect(storageStats.files).toHaveProperty('totalBytes');
        expect(typeof storageStats.files.totalFiles).toBe('number');
        expect(typeof storageStats.files.totalBytes).toBe('string');

        expect(storageStats).toHaveProperty('cache');
        expect(storageStats.cache).toHaveProperty('beatmaps');
        expect(storageStats.cache).toHaveProperty('beatmapsets');
        expect(storageStats.cache).toHaveProperty('beatmapsetFiles');
        expect(storageStats.cache).toHaveProperty('beatmapOsuFiles');
    });

    test('Should include cache statistics with correct structure', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const cacheStats = data.data.manager.storage.cache;

        expect(cacheStats.beatmaps).toHaveProperty('byId');
        expect(cacheStats.beatmaps).toHaveProperty('ids');
        expect(cacheStats.beatmaps.ids).toHaveProperty('byHash');
        expect(typeof cacheStats.beatmaps.byId).toBe('number');
        expect(typeof cacheStats.beatmaps.ids.byHash).toBe('number');

        expect(cacheStats.beatmapsets).toHaveProperty('byId');
        expect(typeof cacheStats.beatmapsets.byId).toBe('number');

        expect(cacheStats.beatmapsetFiles).toHaveProperty('byId');
        expect(typeof cacheStats.beatmapsetFiles.byId).toBe('number');

        expect(cacheStats.beatmapOsuFiles).toHaveProperty('byId');
        expect(typeof cacheStats.beatmapOsuFiles.byId).toBe('number');
    });

    test('Should include mirrors statistics with correct structure', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const mirrorsStats = data.data.manager.mirrors;

        expect(mirrorsStats).toHaveProperty('activeMirrors');
        expect(Array.isArray(mirrorsStats.activeMirrors)).toBe(true);

        expect(mirrorsStats).toHaveProperty('rateLimitsTotal');
        expect(typeof mirrorsStats.rateLimitsTotal).toBe('object');
    });

    test('Should include active mirrors with correct structure', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const activeMirrors = data.data.manager.mirrors.activeMirrors;

        if (activeMirrors.length > 0) {
            const mirror = activeMirrors[0];

            expect(mirror).toHaveProperty('name');
            expect(mirror).toHaveProperty('url');
            expect(mirror).toHaveProperty('rateLimit');
            expect(mirror).toHaveProperty('requests');

            expect(typeof mirror.name).toBe('string');
            expect(typeof mirror.url).toBe('string');

            if ('onCooldownUntil' in mirror) {
                expect(
                    mirror.onCooldownUntil === null ||
                        typeof mirror.onCooldownUntil === 'number',
                ).toBe(true);
            }
            expect(Array.isArray(mirror.rateLimit)).toBe(true);
            expect(typeof mirror.requests).toBe('object');

            expect(mirror.requests).toHaveProperty('lifetime');
            expect(mirror.requests).toHaveProperty('session');
            expect(mirror.requests).toHaveProperty('hour');
            expect(mirror.requests).toHaveProperty('day');
            expect(mirror.requests).toHaveProperty('week');
            expect(mirror.requests).toHaveProperty('month');

            const timeRange = mirror.requests.lifetime;
            expect(timeRange).toHaveProperty('total');
            expect(timeRange).toHaveProperty('successful');
            expect(timeRange).toHaveProperty('failed');
            expect(typeof timeRange.total).toBe('number');
            expect(typeof timeRange.successful).toBe('number');
            expect(typeof timeRange.failed).toBe('number');
        }
    });

    test('Should include rate limit information in active mirrors', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const activeMirrors = data.data.manager.mirrors.activeMirrors;

        if (activeMirrors.length > 0) {
            const mirror = activeMirrors[0];
            const rateLimit = mirror.rateLimit;

            if (rateLimit.length > 0) {
                const capacity = rateLimit[0];
                expect(capacity).toHaveProperty('ability');
                expect(capacity).toHaveProperty('limit');
                expect(capacity).toHaveProperty('remaining');
                expect(typeof capacity.ability).toBe('string');
                expect(typeof capacity.limit).toBe('number');
                expect(typeof capacity.remaining).toBe('number');
            }
        }
    });

    test('Should return consistent response structure on multiple requests', async () => {
        const response1 = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );
        const data1 = await response1.json();

        const response2 = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );
        const data2 = await response2.json();

        // Both should have the same structure
        expect(data1).toHaveProperty('data');
        expect(data2).toHaveProperty('data');
        expect(data1.data).toHaveProperty('server');
        expect(data2.data).toHaveProperty('server');
        expect(data1.data).toHaveProperty('manager');
        expect(data2.data).toHaveProperty('manager');

        // Server stats should have same structure (values may differ)
        expect(Object.keys(data1.data.server)).toEqual(
            Object.keys(data2.data.server),
        );
        expect(Object.keys(data1.data.manager)).toEqual(
            Object.keys(data2.data.manager),
        );
    });

    test('Should have valid uptime format', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const uptime = data.data.server.uptime;

        // Uptime nanoseconds should be a positive number
        expect(uptime.nanoseconds).toBeGreaterThan(0);

        // Uptime pretty should match format like "0d 0h 0m 0s"
        expect(uptime.pretty).toMatch(/^\d+d \d+h \d+m \d+s$/);
    });

    test('Should have valid memory values', async () => {
        const response = await app.handle(
            new Request('http://localhost/stats', {
                method: 'GET',
            }),
        );

        const data = await response.json();
        const memory = data.data.server.memory;

        // Memory values should be strings (human-readable format)
        expect(typeof memory.rss).toBe('string');
        expect(typeof memory.heapTotal).toBe('string');
        expect(typeof memory.heapUsed).toBe('string');
        expect(typeof memory.external).toBe('string');
        expect(typeof memory.arrayBuffers).toBe('string');

        // Memory values should end with "MB" or similar
        expect(memory.rss).toMatch(/MB$/);
    });
});
