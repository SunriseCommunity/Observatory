import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    jest,
    mock,
    setSystemTime,
    test,
} from 'bun:test';

import { MirrorsManager } from '../src/core/managers/mirrors/mirrors.manager';
import { StorageManager } from '../src/core/managers/storage/storage.manager';
import { BanchoClient } from '../src/core/domains/osu.ppy.sh/bancho.client';
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
import { DirectClient } from '../src/core/domains';

const mirrors: (new (...args: any[]) => BaseClient)[] = [
    MinoClient,
    BanchoClient,
    GatariClient,
    NerinyanClient,
    OsulabsClient,
    DirectClient,
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

    const getMirrorClient = (
        mirror: new (...args: any[]) => BaseClient,
        initMirrors: (new (...args: any[]) => BaseClient)[] = [],
    ) => {
        const mirrorsToInitialize = [...initMirrors, mirror];

        config.MirrorsToIgnore = mirrors
            .filter((m) => !mirrorsToInitialize.includes(m))
            .map((m) => m.name.slice(0, -6).toLowerCase());

        let isMirrorsManagerInitialized = mirrorsManager !== null;

        if (!isMirrorsManagerInitialized) {
            mirrorsManager = new MirrorsManager(mockStorageManager);

            assert(
                // @ts-expect-error accessing protected property for testing
                mirrorsManager.clients.length === mirrorsToInitialize.length,
                // @ts-expect-error accessing protected property for testing
                `Expected ${mirrorsToInitialize.length} clients, got ${mirrorsManager.clients.length}`,
            );
        }

        // @ts-expect-error accessing protected property for testing
        const client = mirrorsManager.clients.find(
            (c: any) => c.client instanceof mirror,
        )?.client;

        assert(client, `Expected client ${mirror.name} not found`);

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

    describe('General methods', () => {
        describe('GetBeatmapSetById', () => {
            const mirrors = getMirrorsWithAbility(
                ClientAbilities.GetBeatmapSetById,
            );

            test.each(mirrors)(
                `$name: Should successfully fetch a beatmapset by id`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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
                `$name: Should successfully return 502 when API request fails and no other mirrors are available`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    expect(awaitedResult.status).toBe(502);
                    expect(awaitedResult.result).toBeNull();
                },
            );
        });

        describe('GetBeatmapById', () => {
            const mirrors = getMirrorsWithAbility(
                ClientAbilities.GetBeatmapById,
            );

            test.each(mirrors)(
                `$name: Should successfully fetch a beatmap by id`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    capacity = client.getCapacity(
                        ClientAbilities.GetBeatmapById,
                    );

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

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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
                `$name: Should successfully return 502 when API request fails and no other mirrors are available`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    expect(awaitedResult.status).toBe(502);
                    expect(awaitedResult.result).toBeNull();
                },
            );
        });

        describe('GetBeatmapByHash', () => {
            const mirrors = getMirrorsWithAbility(
                ClientAbilities.GetBeatmapByHash,
            );

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

                    capacity = client.getCapacity(
                        ClientAbilities.GetBeatmapByHash,
                    );

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
                `$name: Should successfully return 502 when API request fails and no other mirrors are available`,
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

                    expect(awaitedResult.status).toBe(502);
                    expect(awaitedResult.result).toBeNull();
                },
            );
        });

        describe('DownloadBeatmapSetById', () => {
            const mirrors = getMirrorsWithAbility(
                ClientAbilities.DownloadBeatmapSetById,
            );

            test.each(mirrors)(
                `$name: Should successfully download a beatmap set by id`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

                    const { mockArrayBuffer } =
                        Mocker.getClientMockMethods(client);

                    mockArrayBuffer();

                    const result = await mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                    });

                    expect(result.status).toBe(200);
                    expect(result.result).not.toBeNull();
                    expect(result.result?.byteLength).toBe(1024);
                },
            );

            test.each(mirrors)(
                `$name: Should successfully update ratelimit during download beatmap set by id request`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

                    const { generateArrayBuffer } =
                        Mocker.getClientGenerateMethods(client);

                    const mockApiGet = Mocker.mockRequest(
                        client,
                        'baseApi',
                        'get',
                        {
                            data: generateArrayBuffer(),
                            status: 200,
                            headers: {},
                        },
                    );

                    const request = mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                    });

                    // Skip a tick to check if is on cooldown
                    await new Promise((r) => setTimeout(r, 0));

                    let capacity = client.getCapacity(
                        ClientAbilities.DownloadBeatmapSetById,
                    );

                    expect(capacity.remaining).toBeLessThan(capacity.limit);

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    capacity = client.getCapacity(
                        ClientAbilities.DownloadBeatmapSetById,
                    );

                    expect(awaitedResult.status).toBe(200);
                    expect(awaitedResult.result).not.toBeNull();

                    expect(awaitedResult.result?.byteLength).toBe(1024);

                    expect(capacity.remaining).toBeLessThan(capacity.limit);
                },
            );

            test.each(mirrors)(
                `$name: Should successfully return 404 when download beatmap set by id is not found`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const request = mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                    });

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    expect(awaitedResult.status).toBe(404);
                    expect(awaitedResult.result).toBeNull();
                },
            );

            test.each(mirrors)(
                `$name: Should successfully return 502 when API request fails and no other mirrors are available when downloading beatmap set by id`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const request = mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                    });

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    expect(awaitedResult.status).toBe(502);
                    expect(awaitedResult.result).toBeNull();
                },
            );
        });

        describe('DownloadBeatmapSetByIdNoVideo', () => {
            const mirrors = getMirrorsWithAbility(
                ClientAbilities.DownloadBeatmapSetByIdNoVideo,
            );

            test.each(mirrors)(
                `$name: Should successfully download a beatmap set by id without video`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

                    const { mockArrayBuffer } =
                        Mocker.getClientMockMethods(client);

                    mockArrayBuffer();

                    const result = await mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                        noVideo: true,
                    });

                    expect(result.status).toBe(200);
                    expect(result.result).not.toBeNull();
                    expect(result.result?.byteLength).toBe(1024);
                },
            );

            test.each(mirrors)(
                `$name: Should successfully update ratelimit during download beatmap set by id without video request`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

                    const { generateArrayBuffer } =
                        Mocker.getClientGenerateMethods(client);

                    const mockApiGet = Mocker.mockRequest(
                        client,
                        'baseApi',
                        'get',
                        {
                            data: generateArrayBuffer(),
                            status: 200,
                            headers: {},
                        },
                    );

                    const request = mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                        noVideo: true,
                    });

                    // Skip a tick to check if is on cooldown
                    await new Promise((r) => setTimeout(r, 0));

                    let capacity = client.getCapacity(
                        ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                    );

                    expect(capacity.remaining).toBeLessThan(capacity.limit);

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    capacity = client.getCapacity(
                        ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                    );

                    expect(awaitedResult.status).toBe(200);
                    expect(awaitedResult.result).not.toBeNull();

                    expect(awaitedResult.result?.byteLength).toBe(1024);

                    expect(capacity.remaining).toBeLessThan(capacity.limit);
                },
            );

            test.each(mirrors)(
                `$name: Should successfully return 404 when download beatmap set by id without video is not found`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const request = mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                        noVideo: true,
                    });

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    expect(awaitedResult.status).toBe(404);
                    expect(awaitedResult.result).toBeNull();
                },
            );

            test.each(mirrors)(
                `$name: Should successfully return 502 when API request fails and no other mirrors are available when downloading beatmap set by id without video`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapSetId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const request = mirrorsManager.downloadBeatmapSet({
                        beatmapSetId,
                        noVideo: true,
                    });

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    expect(awaitedResult.status).toBe(502);
                    expect(awaitedResult.result).toBeNull();
                },
            );
        });

        describe('DownloadOsuBeatmap', () => {
            const mirrors = getMirrorsWithAbility(
                ClientAbilities.DownloadOsuBeatmap,
            );

            test.each(mirrors)(
                `$name: Should successfully download an osu beatmap`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

                    const { mockArrayBuffer } =
                        Mocker.getClientMockMethods(client);

                    mockArrayBuffer();

                    const result = await mirrorsManager.downloadOsuBeatmap({
                        beatmapId,
                    });

                    expect(result.status).toBe(200);
                    expect(result.result).not.toBeNull();
                    expect(result.result?.byteLength).toBe(1024);
                },
            );

            test.each(mirrors)(
                `$name: Should successfully update ratelimit during download osu beatmap request`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

                    const { generateArrayBuffer } =
                        Mocker.getClientGenerateMethods(client);

                    const mockApiGet = Mocker.mockRequest(
                        client,
                        'baseApi',
                        'get',
                        {
                            data: generateArrayBuffer(),
                            status: 200,
                            headers: {},
                        },
                    );

                    const request = mirrorsManager.downloadOsuBeatmap({
                        beatmapId,
                    });

                    // Skip a tick to check if is on cooldown
                    await new Promise((r) => setTimeout(r, 0));

                    let capacity = client.getCapacity(
                        ClientAbilities.DownloadOsuBeatmap,
                    );

                    expect(capacity.remaining).toBeLessThan(capacity.limit);

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    capacity = client.getCapacity(
                        ClientAbilities.DownloadOsuBeatmap,
                    );

                    expect(awaitedResult.status).toBe(200);
                    expect(awaitedResult.result).not.toBeNull();
                    expect(awaitedResult.result?.byteLength).toBe(1024);

                    expect(capacity.remaining).toBeLessThan(capacity.limit);
                },
            );

            test.each(mirrors)(
                `$name: Should successfully return 404 when download osu beatmap is not found`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const request = mirrorsManager.downloadOsuBeatmap({
                        beatmapId,
                    });

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    expect(awaitedResult.status).toBe(404);
                    expect(awaitedResult.result).toBeNull();
                },
            );

            test.each(mirrors)(
                `$name: Should successfully return 502 when API request fails and no other mirrors are available when downloading osu beatmap`,
                async (mirror) => {
                    const client = getMirrorClient(mirror);

                    const beatmapId = faker.number.int({
                        min: 1,
                        max: 1000000,
                    });

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

                    const request = mirrorsManager.downloadOsuBeatmap({
                        beatmapId,
                    });

                    const awaitedResult = await request;

                    expect(mockApiGet).toHaveBeenCalledTimes(1);

                    expect(awaitedResult.status).toBe(502);
                    expect(awaitedResult.result).toBeNull();
                },
            );
        });
    });

    describe('Specific cases', () => {
        test('Use another mirror when the best one is on cooldown', async () => {
            const minoClient = getMirrorClient(MinoClient, [BanchoClient]);
            const banchoClient = getMirrorClient(BanchoClient);

            const { mockBeatmap: mockBanchoBeatmapFunc } =
                Mocker.getClientMockMethods(banchoClient);

            const { mockBeatmap: mockMinoBeatmapFunc } =
                Mocker.getClientMockMethods(minoClient);

            Mocker.mockSyncRequest(banchoClient, 'self', 'getCapacity', {
                limit: 1,
                remaining: 1,
            });

            Mocker.mockSyncRequest(minoClient, 'self', 'getCapacity', {
                limit: 1,
                remaining: 0,
            });

            const mockMinoBeatmap = mockMinoBeatmapFunc({
                data: {
                    id: 1,
                },
            });

            const mockBanchoBeatmap = mockBanchoBeatmapFunc({
                data: {
                    id: 1,
                },
            });

            const result = await mirrorsManager.getBeatmap({
                beatmapId: 1,
            });

            expect(mockMinoBeatmap).toHaveBeenCalledTimes(0);
            expect(mockBanchoBeatmap).toHaveBeenCalledTimes(1);

            expect(result.status).toBe(200);
            expect(result.result).not.toBeNull();
            expect(result.result?.id).toBe(1);

            Mocker.mockSyncRequest(banchoClient, 'self', 'getCapacity', {
                limit: 1,
                remaining: 0,
            });

            Mocker.mockSyncRequest(minoClient, 'self', 'getCapacity', {
                limit: 1,
                remaining: 1,
            });

            const result2 = await mirrorsManager.getBeatmap({
                beatmapId: 1,
            });

            expect(mockMinoBeatmap).toHaveBeenCalledTimes(1);
            expect(mockBanchoBeatmap).toHaveBeenCalledTimes(1);

            expect(result2.status).toBe(200);
            expect(result2.result).not.toBeNull();
            expect(result2.result?.id).toBe(1);
        });

        test('DisableSafeRatelimitMode is set to false, should complete only 90% of the requests', async () => {
            config.DisableSafeRatelimitMode = false;

            const minoClient = getMirrorClient(MinoClient);

            const { mockBeatmap: mockMinoBeatmapFunc } =
                Mocker.getClientMockMethods(minoClient);

            const totalRequestsLimit = minoClient.getCapacity(
                ClientAbilities.GetBeatmapById,
            ).limit;

            const shouldStopAt = Math.floor(totalRequestsLimit * 0.9);

            for (let i = 0; i < totalRequestsLimit; i++) {
                const mockMinoBeatmap = mockMinoBeatmapFunc({
                    data: {
                        id: 1,
                    },
                });

                const result = await mirrorsManager.getBeatmap({
                    beatmapId: 1,
                });

                expect(result.status).toBe(i < shouldStopAt ? 200 : 502);
                expect(result.result?.id ?? null).toBe(
                    i < shouldStopAt ? 1 : null,
                );
                expect(mockMinoBeatmap).toHaveBeenCalledTimes(
                    Math.min(i + 1, shouldStopAt),
                );
            }
        });

        test('DisableSafeRatelimitMode is set to true, should complete 100% of the requests', async () => {
            config.DisableSafeRatelimitMode = true;

            const minoClient = getMirrorClient(MinoClient);

            const { mockBeatmap: mockMinoBeatmapFunc } =
                Mocker.getClientMockMethods(minoClient);

            const totalRequestsLimit = minoClient.getCapacity(
                ClientAbilities.GetBeatmapById,
            ).limit;

            for (let i = 0; i < totalRequestsLimit; i++) {
                const mockMinoBeatmap = mockMinoBeatmapFunc({
                    data: {
                        id: 1,
                    },
                });

                const result = await mirrorsManager.getBeatmap({
                    beatmapId: 1,
                });

                expect(result.status).toBe(200);
                expect(result.result?.id ?? null).toBe(1);
                expect(mockMinoBeatmap).toHaveBeenCalledTimes(i + 1);
            }
        });

        test('Should clear outdated requests in rate-limiter', async () => {
            const minoClient = getMirrorClient(MinoClient);

            const { mockBeatmap } = Mocker.getClientMockMethods(minoClient);

            // @ts-expect-error skip type check due to protected property
            Mocker.mockSyncRequest(
                minoClient,
                'api',
                'getRequestsArray',
                new Map([
                    ['/', new Date(Date.now() - 1000 * 65)],
                    ['/', new Date(Date.now() - 1000 * 55)],
                ]),
            );

            const mockedBeatmap = mockBeatmap({
                data: {
                    id: 1,
                },
            });

            const result = await mirrorsManager.getBeatmap({
                beatmapId: 1,
            });

            expect(mockedBeatmap).toHaveBeenCalledTimes(1);

            expect(result.status).toBe(200);
            expect(result.result).not.toBeNull();
            expect(result.result?.id).toBe(1);

            const currentRatelimit = minoClient.getCapacity(
                ClientAbilities.GetBeatmapById,
            );

            // Should count one not outdated request, skip the outdated and add the new request
            expect(currentRatelimit.remaining).toBe(currentRatelimit.limit - 2);
        });

        test('Should clear outdated requests from memory', async () => {
            const minoClient = getMirrorClient(MinoClient);

            const { mockBeatmap } = Mocker.getClientMockMethods(minoClient);

            let currentRatelimit = minoClient.getCapacity(
                ClientAbilities.GetBeatmapById,
            );

            expect(currentRatelimit.remaining).toBe(currentRatelimit.limit);

            mockBeatmap({
                data: {
                    id: 1,
                },
            });

            const result = await mirrorsManager.getBeatmap({
                beatmapId: 1,
            });

            expect(result.status).toBe(200);
            expect(result.result).not.toBeNull();
            expect(result.result?.id).toBe(1);

            currentRatelimit = minoClient.getCapacity(
                ClientAbilities.GetBeatmapById,
            );

            // @ts-expect-error skip type check due to protected property
            const requests = Array.from(minoClient.api.requests.values())
                .filter((v) => v instanceof Map && v.size > 0)
                .flatMap((v) => Array.from(v.entries())).length;

            expect(requests).toBe(1);

            expect(currentRatelimit.remaining).toBe(currentRatelimit.limit - 1);

            setSystemTime(new Date(Date.now() + 1000 * 60 * 60 * 24));

            mockBeatmap({
                data: {
                    id: 1,
                },
            });

            const result2 = await mirrorsManager.getBeatmap({
                beatmapId: 1,
            });

            expect(result2.status).toBe(200);
            expect(result2.result).not.toBeNull();
            expect(result2.result?.id).toBe(1);

            currentRatelimit = minoClient.getCapacity(
                ClientAbilities.GetBeatmapById,
            );

            // @ts-expect-error skip type check due to protected property
            const requests2 = Array.from(minoClient.api.requests.values())
                .filter((v) => v instanceof Map && v.size > 0)
                .flatMap((v) => Array.from(v.entries())).length;

            expect(requests2).toBe(1);

            expect(currentRatelimit.remaining).toBe(currentRatelimit.limit - 1);
        });
    });
});
