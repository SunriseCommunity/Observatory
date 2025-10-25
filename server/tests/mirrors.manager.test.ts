import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
    mock,
    test,
} from 'bun:test';

import { MirrorsManager } from '../src/core/managers/mirrors/mirrors.manager';
import { StorageManager } from '../src/core/managers/storage/storage.manager';
import { BanchoClient } from '../src/core/domains/osu.ppy.sh/bancho.client';
import { FakerGenerator } from './utils/faker.generator';
import { Mocker } from './utils/mocker';
import { ClientAbilities } from '../src/core/abstracts/client/base-client.types';
import { BaseClient } from '../src/core/abstracts/client/base-client.abstract';
import { MinoClient } from '../src/core/domains/catboy.best/mino.client';
import { OsulabsClient } from '../src/core/domains/beatmaps.download/osulabs.client';
import { GatariClient } from '../src/core/domains/gatari.pw/gatari.client';
import { NerinyanClient } from '../src/core/domains/nerinyan.moe/nerinyan.client';
import assert from 'assert';
import { faker } from '@faker-js/faker';
import config from '../src/config';

const mirrors: (new (...args: any[]) => BaseClient)[] = [
    MinoClient,
    BanchoClient,
    GatariClient,
    NerinyanClient,
    OsulabsClient,
];

const getMirrorsWithAbility = (ability: ClientAbilities) => {
    return mirrors.filter((mirror) =>
        new mirror().clientConfig.abilities.includes(ability),
    );
};

describe('MirrorsManager', () => {
    let mirrorsManager: MirrorsManager;
    let mockStorageManager: StorageManager;

    beforeAll(async () => {
        await Mocker.ensureDatabaseInitialized();

        mockStorageManager = {
            getBeatmapSet: mock(async () => undefined),
            insertBeatmapset: mock(async () => {}),
        } as unknown as StorageManager;
    });

    beforeEach(async () => {
        jest.restoreAllMocks();
        mirrorsManager = null!;
        Mocker.mockMirrorsBenchmark();
    });

    const getMirrorClient = (mirror: new (...args: any[]) => BaseClient) => {
        config.MirrorsToIgnore = mirrors
            .filter((m) => m !== mirror)
            .map((m) => m.name.slice(0, -6).toLowerCase());

        mirrorsManager = new MirrorsManager(mockStorageManager);

        // @ts-expect-error accessing protected property for testing
        const client = mirrorsManager.clients.find(
            (c: any) => c.client instanceof mirror,
        )?.client;

        assert(
            // @ts-expect-error accessing protected property for testing
            mirrorsManager.clients.length > 1,
            'More than one client found',
        );

        assert(client, `Client ${mirror.name} not found`);

        if (client instanceof BanchoClient) {
            Mocker.mockRequest(
                client,
                'banchoService',
                'getBanchoClientToken',
                'test',
            );
        }

        return client;
    };

    const mirrorsWithGetBeatmapSetById = getMirrorsWithAbility(
        ClientAbilities.GetBeatmapSetById,
    );

    const mirrorsWithGetBeatmapById = getMirrorsWithAbility(
        ClientAbilities.GetBeatmapById,
    );

    const mirrorsWithGetBeatmapByHash = getMirrorsWithAbility(
        ClientAbilities.GetBeatmapByHash,
    );

    describe('GetBeatmapSetById', () => {
        const mirrors = mirrorsWithGetBeatmapSetById;

        test.each(mirrors)(
            `$name: Should successfully fetch a beatmapset by id`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapSetId = faker.number.int({ min: 1, max: 1000000 });

                const { mockBeatmapset, mockBeatmap } =
                    Mocker.getClientMockMethods(client);

                mockBeatmapset({
                    data: {
                        id: beatmapSetId,
                    },
                });

                const result = await mirrorsManager.getBeatmapSet({
                    beatmapSetId,
                });

                expect(result.status).toBe(200);
                expect(result.result).not.toBeNull();
                expect(result.result?.id).toBe(beatmapSetId);
            },
        );

        test.each(mirrors)(
            `$name: Should successfully update ratelimit during get beatmapset by id request`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const { generateBeatmapset } =
                    Mocker.getClientGenerateMethods(client);

                const beatmapSetId = faker.number.int({ min: 1, max: 1000000 });

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: generateBeatmapset({ id: beatmapSetId }),
                        status: 200,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmapSet({
                    beatmapSetId,
                });

                // Skip a tick to check if is on cooldown
                await new Promise((r) => setTimeout(r, 0));

                let capacity = client.getCapacity(
                    ClientAbilities.GetBeatmapSetById,
                );

                expect(capacity.remaining).toBeLessThan(capacity.limit);

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                capacity = client.getCapacity(
                    ClientAbilities.GetBeatmapSetById,
                );

                expect(awaitedResult.status).toBe(200);
                expect(awaitedResult.result).not.toBeNull();
                expect(awaitedResult.result?.id).toBe(beatmapSetId);

                expect(capacity.remaining).toBeLessThan(capacity.limit);
            },
        );

        test.each(mirrors)(
            `$name: Should successfully return 404 when beatmapset is not found`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapSetId = faker.number.int({ min: 1, max: 1000000 });

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: null,
                        status: 404,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmapSet({
                    beatmapSetId,
                });

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                expect(awaitedResult.status).toBe(404);
                expect(awaitedResult.result).toBeNull();
            },
        );

        test.each(mirrors)(
            `$name: Should successfully return 501 when API request fails and no other mirrors are available`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapSetId = faker.number.int({ min: 1, max: 1000000 });

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: null,
                        status: 500,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmapSet({
                    beatmapSetId,
                });

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                expect(awaitedResult.status).toBe(501);
                expect(awaitedResult.result).toBeNull();
            },
        );
    });

    describe('GetBeatmapById', () => {
        const mirrors = mirrorsWithGetBeatmapById;

        test.each(mirrors)(
            `$name: Should successfully fetch a beatmap by id`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapId = faker.number.int({ min: 1, max: 1000000 });

                const { mockBeatmap } = Mocker.getClientMockMethods(client);
                mockBeatmap({
                    data: {
                        id: beatmapId,
                    },
                });

                const result = await mirrorsManager.getBeatmap({
                    beatmapId,
                });

                expect(result.status).toBe(200);
                expect(result.result).not.toBeNull();
                expect(result.result?.id).toBe(beatmapId);
            },
        );

        test.each(mirrors)(
            `$name: Should successfully update ratelimit during get beatmap by id request`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const { generateBeatmap } =
                    Mocker.getClientGenerateMethods(client);

                const beatmapId = faker.number.int({ min: 1, max: 1000000 });

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: generateBeatmap({ id: beatmapId }),
                        status: 200,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmap({
                    beatmapId,
                });

                // Skip a tick to check if is on cooldown
                await new Promise((r) => setTimeout(r, 0));

                let capacity = client.getCapacity(
                    ClientAbilities.GetBeatmapById,
                );

                expect(capacity.remaining).toBeLessThan(capacity.limit);

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                capacity = client.getCapacity(ClientAbilities.GetBeatmapById);

                expect(awaitedResult.status).toBe(200);
                expect(awaitedResult.result).not.toBeNull();
                expect(awaitedResult.result?.id).toBe(beatmapId);

                expect(capacity.remaining).toBeLessThan(capacity.limit);
            },
        );

        test.each(mirrors)(
            `$name: Should successfully return 404 when beatmap is not found`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapId = faker.number.int({ min: 1, max: 1000000 });

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: null,
                        status: 404,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmap({
                    beatmapId,
                });

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                expect(awaitedResult.status).toBe(404);
                expect(awaitedResult.result).toBeNull();
            },
        );

        test.each(mirrors)(
            `$name: Should successfully return 501 when API request fails and no other mirrors are available`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapId = faker.number.int({ min: 1, max: 1000000 });

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: null,
                        status: 500,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmap({
                    beatmapId,
                });

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                expect(awaitedResult.status).toBe(501);
                expect(awaitedResult.result).toBeNull();
            },
        );
    });

    describe('GetBeatmapByHash', () => {
        const mirrors = mirrorsWithGetBeatmapByHash;

        test.each(mirrors)(
            `$name: Should successfully fetch a beatmap by hash`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapHash = faker.string.uuid();

                const { mockBeatmap } = Mocker.getClientMockMethods(client);

                mockBeatmap({
                    data: {
                        checksum: beatmapHash,
                    },
                });

                const result = await mirrorsManager.getBeatmap({
                    beatmapHash,
                });

                expect(result.status).toBe(200);
                expect(result.result).not.toBeNull();
                expect(result.result?.checksum).toBe(beatmapHash);
            },
        );

        test.each(mirrors)(
            `$name: Should successfully update ratelimit during get beatmap by hash request`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapHash = faker.string.uuid();

                const { generateBeatmap, generateBeatmapset } =
                    Mocker.getClientGenerateMethods(client);

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: generateBeatmap({
                            checksum: beatmapHash,
                        }),
                        status: 200,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmap({
                    beatmapHash,
                });

                // Skip a tick to check if is on cooldown
                await new Promise((r) => setTimeout(r, 0));

                let capacity = client.getCapacity(
                    ClientAbilities.GetBeatmapByHash,
                );

                expect(capacity.remaining).toBeLessThan(capacity.limit);

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                capacity = client.getCapacity(ClientAbilities.GetBeatmapByHash);

                expect(awaitedResult.status).toBe(200);
                expect(awaitedResult.result).not.toBeNull();

                expect(awaitedResult.result?.checksum).toBe(beatmapHash);

                expect(capacity.remaining).toBeLessThan(capacity.limit);
            },
        );

        test.each(mirrors)(
            `$name: Should successfully return 404 when beatmap is not found`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapHash = faker.string.uuid();

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: null,
                        status: 404,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmap({
                    beatmapHash,
                });

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                expect(awaitedResult.status).toBe(404);
                expect(awaitedResult.result).toBeNull();
            },
        );

        test.each(mirrors)(
            `$name: Should successfully return 501 when API request fails and no other mirrors are available`,
            async (mirror) => {
                const client = getMirrorClient(mirror);

                const beatmapHash = faker.string.uuid();

                const mockApiGet = Mocker.mockRequest(
                    client,
                    'baseApi',
                    'get',
                    {
                        data: null,
                        status: 500,
                        headers: {},
                    },
                );

                const request = mirrorsManager.getBeatmap({
                    beatmapHash,
                });

                const awaitedResult = await request;

                expect(mockApiGet).toHaveBeenCalledTimes(1);

                expect(awaitedResult.status).toBe(501);
                expect(awaitedResult.result).toBeNull();
            },
        );
    });
});
