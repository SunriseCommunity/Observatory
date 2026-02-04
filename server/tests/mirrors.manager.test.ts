import assert from "node:assert";

import { faker } from "@faker-js/faker";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  mock,
  setSystemTime,
  test,
} from "bun:test";

import config from "../src/config";
import type { BaseClient } from "../src/core/abstracts/client/base-client.abstract";
import { ClientAbilities } from "../src/core/abstracts/client/base-client.types";
import { DirectClient } from "../src/core/domains";
import { OsulabsClient } from "../src/core/domains/beatmaps.download/osulabs.client";
import { MinoClient } from "../src/core/domains/catboy.best/mino.client";
import { GatariClient } from "../src/core/domains/gatari.pw/gatari.client";
import { NerinyanClient } from "../src/core/domains/nerinyan.moe/nerinyan.client";
import { BanchoClient } from "../src/core/domains/osu.ppy.sh/bancho.client";
import { MirrorsManager } from "../src/core/managers/mirrors/mirrors.manager";
import type { StorageManager } from "../src/core/managers/storage/storage.manager";
import { Mocker } from "./utils/mocker";

const mirrors: Array<new (...args: any[]) => BaseClient> = [
  MinoClient,
  BanchoClient,
  GatariClient,
  NerinyanClient,
  OsulabsClient,
  DirectClient,
];

function getMirrorsWithAbility(ability: ClientAbilities) {
  return mirrors.filter(Mirror =>
    new Mirror().clientConfig.abilities.includes(ability),
  );
}

describe("MirrorsManager", () => {
  let mirrorsManager: MirrorsManager;
  let mockStorageManager: StorageManager;

  beforeAll(async () => {
    await Mocker.ensureDatabaseInitialized();

    mockStorageManager = {
      getBeatmapSet: mock(async () => {}),
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
    initMirrors: Array<new (...args: any[]) => BaseClient> = [],
  ) => {
    const mirrorsToInitialize = [...initMirrors, mirror];

    config.MirrorsToIgnore = mirrors
      .filter(m => !mirrorsToInitialize.includes(m))
      .map(m => m.name.slice(0, -6).toLowerCase());

    const isMirrorsManagerInitialized = mirrorsManager !== null;

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
        "banchoService",
        "getBanchoClientToken",
        "test",
      );
    }

    return client;
  };

  describe("General methods", () => {
    describe("GetBeatmapSetById", () => {
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

                  const { mockBeatmapset }
                    = Mocker.getClientMockMethods(client);

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

                  const { generateBeatmapset }
                    = Mocker.getClientGenerateMethods(client);

                  const beatmapSetId = faker.number.int({
                    min: 1,
                    max: 1000000,
                  });

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
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
                    "baseApi",
                    "get",
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

    describe("GetBeatmapById", () => {
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

                  const { generateBeatmap }
                    = Mocker.getClientGenerateMethods(client);

                  const beatmapId = faker.number.int({
                    min: 1,
                    max: 1000000,
                  });

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
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
                    "baseApi",
                    "get",
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

    describe("GetBeatmapByHash", () => {
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

                  const { generateBeatmap }
                    = Mocker.getClientGenerateMethods(client);

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
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
                    "baseApi",
                    "get",
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

    describe("DownloadBeatmapSetById", () => {
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

                  const { mockArrayBuffer }
                    = Mocker.getClientMockMethods(client);

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

                  const { generateArrayBuffer }
                    = Mocker.getClientGenerateMethods(client);

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
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
                    "baseApi",
                    "get",
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

    describe("DownloadBeatmapSetByIdNoVideo", () => {
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

                  const { mockArrayBuffer }
                    = Mocker.getClientMockMethods(client);

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

                  const { generateArrayBuffer }
                    = Mocker.getClientGenerateMethods(client);

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
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
                    "baseApi",
                    "get",
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

    describe("GetBeatmapsetsByBeatmapIds", () => {
      const mirrors = getMirrorsWithAbility(
        ClientAbilities.GetBeatmapsetsByBeatmapIds,
      );

      test.each(mirrors)(
                `$name: Should successfully fetch beatmapsets by beatmap ids`,
                async (mirror) => {
                  const client = getMirrorClient(mirror);

                  const beatmapIds = [
                    faker.number.int({ min: 1, max: 1000000 }),
                    faker.number.int({ min: 1, max: 1000000 }),
                  ];

                  const { generateBeatmapset, generateBeatmap }
                    = Mocker.getClientGenerateMethods(client);

                  const beatmapset1 = generateBeatmapset({
                    id: faker.number.int({ min: 1, max: 1000000 }),
                  });
                  const beatmapset2 = generateBeatmapset({
                    id: faker.number.int({ min: 1, max: 1000000 }),
                  });

                  const beatmap1 = generateBeatmap({
                    id: beatmapIds[0],
                    beatmapset_id: beatmapset1.id,
                  });
                  const beatmap2 = generateBeatmap({
                    id: beatmapIds[1],
                    beatmapset_id: beatmapset2.id,
                  });

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
                    {
                      data: {
                        beatmaps: [
                          { ...beatmap1, beatmapset: beatmapset1 },
                          { ...beatmap2, beatmapset: beatmapset2 },
                        ],
                      },
                      status: 200,
                      headers: {},
                    },
                  );

                  const result
                    = await mirrorsManager.getBeatmapsetsByBeatmapIds({
                      beatmapIds,
                    });

                  expect(mockApiGet).toHaveBeenCalledTimes(1);
                  expect(result.status).toBe(200);
                  expect(result.result).not.toBeNull();
                  expect(Array.isArray(result.result)).toBe(true);
                  expect(result.result?.length).toBeGreaterThan(0);
                },
      );

      test.each(mirrors)(
                `$name: Should successfully update ratelimit during get beatmapsets by beatmap ids request`,
                async (mirror) => {
                  const client = getMirrorClient(mirror);

                  const beatmapIds = [
                    faker.number.int({ min: 1, max: 1000000 }),
                  ];

                  const { generateBeatmapset, generateBeatmap }
                    = Mocker.getClientGenerateMethods(client);

                  const beatmapset = generateBeatmapset({
                    id: faker.number.int({ min: 1, max: 1000000 }),
                  });

                  const beatmap = generateBeatmap({
                    id: beatmapIds[0],
                    beatmapset_id: beatmapset.id,
                  });

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
                    {
                      data: {
                        beatmaps: [{ ...beatmap, beatmapset }],
                      },
                      status: 200,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmapsetsByBeatmapIds({
                    beatmapIds,
                  });

                  // Skip a tick to check if is on cooldown
                  await new Promise(r => setTimeout(r, 0));

                  let capacity = client.getCapacity(
                    ClientAbilities.GetBeatmapsetsByBeatmapIds,
                  );

                  expect(capacity.remaining).toBeLessThan(capacity.limit);

                  const awaitedResult = await request;

                  expect(mockApiGet).toHaveBeenCalledTimes(1);

                  capacity = client.getCapacity(
                    ClientAbilities.GetBeatmapsetsByBeatmapIds,
                  );

                  expect(awaitedResult.status).toBe(200);
                  expect(awaitedResult.result).not.toBeNull();
                  expect(Array.isArray(awaitedResult.result)).toBe(true);

                  expect(capacity.remaining).toBeLessThan(capacity.limit);
                },
      );

      test.each(mirrors)(
                `$name: Should successfully return 404 when beatmapsets are not found`,
                async (mirror) => {
                  const client = getMirrorClient(mirror);

                  const beatmapIds = [
                    faker.number.int({ min: 1, max: 1000000 }),
                  ];

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
                    {
                      data: null,
                      status: 404,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmapsetsByBeatmapIds({
                    beatmapIds,
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

                  const beatmapIds = [
                    faker.number.int({ min: 1, max: 1000000 }),
                  ];

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
                    {
                      data: null,
                      status: 500,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmapsetsByBeatmapIds({
                    beatmapIds,
                  });

                  const awaitedResult = await request;

                  expect(mockApiGet).toHaveBeenCalledTimes(1);

                  expect(awaitedResult.status).toBe(502);
                  expect(awaitedResult.result).toBeNull();
                },
      );
    });

    describe("DownloadOsuBeatmap", () => {
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

                  const { mockArrayBuffer }
                    = Mocker.getClientMockMethods(client);

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

                  const { generateArrayBuffer }
                    = Mocker.getClientGenerateMethods(client);

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
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
                    "baseApi",
                    "get",
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

    describe("GetBeatmapByIdWithSomeNonBeatmapValues", () => {
      const mirrors = getMirrorsWithAbility(
        ClientAbilities.GetBeatmapByIdWithSomeNonBeatmapValues,
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
                    allowMissingNonBeatmapValues: true,
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

                  const { generateBeatmap }
                    = Mocker.getClientGenerateMethods(client);

                  const beatmapId = faker.number.int({
                    min: 1,
                    max: 1000000,
                  });

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
                    {
                      data: generateBeatmap({ id: beatmapId }),
                      status: 200,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmap({
                    beatmapId,
                    allowMissingNonBeatmapValues: true,
                  });

                  // Skip a tick to check if is on cooldown
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
                    {
                      data: null,
                      status: 404,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmap({
                    beatmapId,
                    allowMissingNonBeatmapValues: true,
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
                    "baseApi",
                    "get",
                    {
                      data: null,
                      status: 500,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmap({
                    beatmapId,
                    allowMissingNonBeatmapValues: true,
                  });

                  const awaitedResult = await request;

                  expect(mockApiGet).toHaveBeenCalledTimes(1);

                  expect(awaitedResult.status).toBe(502);
                  expect(awaitedResult.result).toBeNull();
                },
      );
    });

    describe("GetBeatmapByHashWithSomeNonBeatmapValues", () => {
      const mirrors = getMirrorsWithAbility(
        ClientAbilities.GetBeatmapByHashWithSomeNonBeatmapValues,
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
                    allowMissingNonBeatmapValues: true,
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

                  const { generateBeatmap }
                    = Mocker.getClientGenerateMethods(client);

                  const mockApiGet = Mocker.mockRequest(
                    client,
                    "baseApi",
                    "get",
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
                    allowMissingNonBeatmapValues: true,
                  });

                  // Skip a tick to check if is on cooldown
                  await new Promise(r => setTimeout(r, 0));

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
                    "baseApi",
                    "get",
                    {
                      data: null,
                      status: 404,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmap({
                    beatmapHash,
                    allowMissingNonBeatmapValues: true,
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
                    "baseApi",
                    "get",
                    {
                      data: null,
                      status: 500,
                      headers: {},
                    },
                  );

                  const request = mirrorsManager.getBeatmap({
                    beatmapHash,
                    allowMissingNonBeatmapValues: true,
                  });

                  const awaitedResult = await request;

                  expect(mockApiGet).toHaveBeenCalledTimes(1);

                  expect(awaitedResult.status).toBe(502);
                  expect(awaitedResult.result).toBeNull();
                },
      );
    });
  });

  describe("Specific cases", () => {
    test("Use another mirror when the best one is on cooldown", async () => {
      const minoClient = getMirrorClient(MinoClient, [BanchoClient]);
      const banchoClient = getMirrorClient(BanchoClient);

      const { mockBeatmap: mockBanchoBeatmapFunc }
        = Mocker.getClientMockMethods(banchoClient);

      const { mockBeatmap: mockMinoBeatmapFunc }
        = Mocker.getClientMockMethods(minoClient);

      Mocker.mockSyncRequest(banchoClient, "self", "getCapacity", {
        limit: 1,
        remaining: 1,
      });

      Mocker.mockSyncRequest(minoClient, "self", "getCapacity", {
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

      Mocker.mockSyncRequest(banchoClient, "self", "getCapacity", {
        limit: 1,
        remaining: 0,
      });

      Mocker.mockSyncRequest(minoClient, "self", "getCapacity", {
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

    test("DisableSafeRatelimitMode is set to false, should complete only 90% of the requests", async () => {
      config.DisableSafeRatelimitMode = false;

      const minoClient = getMirrorClient(MinoClient);

      const { mockBeatmap: mockMinoBeatmapFunc }
        = Mocker.getClientMockMethods(minoClient);

      const totalRequestsLimit = minoClient.getCapacity(
        ClientAbilities.GetBeatmapById,
      ).limit;

      const shouldStopAt = totalRequestsLimit;

      expect(shouldStopAt).toBe(
        Math.floor(
          // @ts-expect-error skip type check due to protected property
          minoClient.api._config.rateLimits.find(limit =>
            limit.abilities.includes(
              ClientAbilities.GetBeatmapById,
            ),
          )!.limit * 0.9,
        ),
      );

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

    test("DisableDailyRateLimit is set to true, daily rate limits should be undefined", async () => {
      config.DisableDailyRateLimit = true;

      const minoClient = getMirrorClient(MinoClient);

      // @ts-expect-error skip type check due to protected property
      const { dailyRateLimits } = minoClient.api.config;

      expect(dailyRateLimits).toBeUndefined();
    });

    test("DisableDailyRateLimit is set to false, daily rate limits should be defined", async () => {
      config.DisableDailyRateLimit = false;

      const minoClient = getMirrorClient(MinoClient);

      // @ts-expect-error skip type check due to protected property
      const { dailyRateLimits } = minoClient.api.config;

      expect(dailyRateLimits).toBeDefined();
      expect(dailyRateLimits?.length).toBeGreaterThan(0);
    });

    test("DisableSafeRatelimitMode is set to true, should complete 100% of the requests", async () => {
      config.DisableSafeRatelimitMode = true;

      const minoClient = getMirrorClient(MinoClient);

      const { mockBeatmap: mockMinoBeatmapFunc }
        = Mocker.getClientMockMethods(minoClient);

      const totalRequestsLimit = minoClient.getCapacity(
        ClientAbilities.GetBeatmapById,
      ).limit;

      expect(totalRequestsLimit).toBe(
        Math.floor(
          // @ts-expect-error skip type check due to protected property
          minoClient.api._config.rateLimits.find(limit =>
            limit.abilities.includes(
              ClientAbilities.GetBeatmapById,
            ),
          )!.limit,
        ),
      );

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

    test("Should clear outdated requests in rate-limiter", async () => {
      const minoClient = getMirrorClient(MinoClient);

      const { mockBeatmap } = Mocker.getClientMockMethods(minoClient);

      // @ts-expect-error skip type check due to protected property
      Mocker.mockSyncRequest(
        minoClient,
        "api",
        "getRequestsArray",
        new Map([
          ["/", new Date(Date.now() - 1000 * 65)],
          ["/", new Date(Date.now() - 1000 * 55)],
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

    test("Should clear outdated requests from memory", async () => {
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
        .filter(v => v instanceof Map && v.size > 0)
        .flatMap(v => Array.from(v.entries()))
        .length;

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
        .filter(v => v instanceof Map && v.size > 0)
        .flatMap(v => Array.from(v.entries()))
        .length;

      expect(requests2).toBe(1);

      expect(currentRatelimit.remaining).toBe(currentRatelimit.limit - 1);

      setSystemTime();
    });

    test.each([502, 503, 504])(
            `Should successfully return 502 when API request sends 5xx error and send mirror to cooldown`,
            async (errorCode) => {
              const minoClient = getMirrorClient(MinoClient);

              const beatmapId = faker.number.int({
                min: 1,
                max: 1000000,
              });

              const mockApiGet = Mocker.mockRequest(
                minoClient,
                "baseApi",
                "get",
                {
                  data: null,
                  status: errorCode,
                  headers: {},
                },
              );

              const request = await mirrorsManager.downloadOsuBeatmap({
                beatmapId,
              });

              expect(mockApiGet).toHaveBeenCalledTimes(1);

              expect(request.status).toBe(502);
              expect(request.result).toBeNull();

              // Second request should send none requests due to cooldown

              const request2 = await mirrorsManager.downloadOsuBeatmap({
                beatmapId,
              });

              expect(mockApiGet).toHaveBeenCalledTimes(1);

              expect(request2.status).toBe(502);
              expect(request2.result).toBeNull();
            },
    );
  });

  describe("Daily rate limits with abilities", () => {
    test("Global daily rate limit (no abilities) should apply to all abilities", async () => {
      config.DisableDailyRateLimit = false;

      const minoClient = getMirrorClient(MinoClient);

      // @ts-expect-error skip type check due to protected property
      const { dailyRateLimits } = minoClient.api.config;

      expect(dailyRateLimits).toBeDefined();
      expect(dailyRateLimits?.length).toBeGreaterThanOrEqual(1);

      // Check that at least one limit is a global limit (no abilities)
      const globalLimit = dailyRateLimits?.find(
        (limit: any) => !limit.abilities?.length,
      );
      expect(globalLimit).toBeDefined();
    });

    test("Multiple daily rate limits with different abilities should be tracked separately", async () => {
      config.DisableDailyRateLimit = false;
      config.DisableSafeRatelimitMode = true;

      // Create a custom client configuration with ability-specific daily limits
      const TestableMinoClient = class extends MinoClient {
        constructor(storageManager: any) {
          super(storageManager);
          // @ts-expect-error accessing protected property for testing
          this.api._config.dailyRateLimits = [
            { limit: 100, abilities: [ClientAbilities.DownloadBeatmapSetById, ClientAbilities.DownloadBeatmapSetByIdNoVideo] },
            { limit: 200, abilities: [ClientAbilities.GetBeatmapById, ClientAbilities.GetBeatmapByHash] },
            { limit: 50 }, // Global fallback for other abilities
          ];
        }
      };

      config.MirrorsToIgnore = mirrors
        .filter(m => m !== MinoClient)
        .map(m => m.name.slice(0, -6).toLowerCase());

      mirrorsManager = new MirrorsManager(mockStorageManager);

      // Override the client with our testable version
      // @ts-expect-error accessing protected property for testing
      mirrorsManager.clients[0].client = new TestableMinoClient(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      const testClient = mirrorsManager.clients[0].client;

      // @ts-expect-error skip type check due to protected property
      const { dailyRateLimits } = testClient.api.config;

      expect(dailyRateLimits).toBeDefined();
      expect(dailyRateLimits?.length).toBe(3);

      // Check that the first limit applies to download abilities
      const downloadLimit = dailyRateLimits?.find(
        (limit: any) => limit.abilities?.includes(ClientAbilities.DownloadBeatmapSetById),
      );
      expect(downloadLimit).toBeDefined();
      expect(downloadLimit?.limit).toBe(100);

      // Check that the second limit applies to get beatmap abilities
      const getBeatmapLimit = dailyRateLimits?.find(
        (limit: any) => limit.abilities?.includes(ClientAbilities.GetBeatmapById),
      );
      expect(getBeatmapLimit).toBeDefined();
      expect(getBeatmapLimit?.limit).toBe(200);

      // Check that the global limit exists (no abilities)
      const globalLimit = dailyRateLimits?.find(
        (limit: any) => !limit.abilities?.length,
      );
      expect(globalLimit).toBeDefined();
      expect(globalLimit?.limit).toBe(50);
    });

    test("Ability-specific daily limit should block only that ability when exhausted", async () => {
      config.DisableDailyRateLimit = false;
      config.DisableSafeRatelimitMode = true;

      // Create a custom client with very low limit for download
      const TestableMinoClient = class extends MinoClient {
        constructor(storageManager: any) {
          super(storageManager);
          // @ts-expect-error accessing protected property for testing
          this.api._config.dailyRateLimits = [
            { limit: 1, abilities: [ClientAbilities.DownloadOsuBeatmap] },
            { limit: 1000 }, // High global limit for other abilities
          ];
        }
      };

      config.MirrorsToIgnore = mirrors
        .filter(m => m !== MinoClient)
        .map(m => m.name.slice(0, -6).toLowerCase());

      mirrorsManager = new MirrorsManager(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      mirrorsManager.clients[0].client = new TestableMinoClient(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      const testClient = mirrorsManager.clients[0].client;

      const { mockArrayBuffer } = Mocker.getClientMockMethods(testClient);
      const { generateBeatmap } = Mocker.getClientGenerateMethods(testClient);

      // First download should succeed
      mockArrayBuffer();
      const downloadResult1 = await mirrorsManager.downloadOsuBeatmap({
        beatmapId: 1,
      });
      expect(downloadResult1.status).toBe(200);

      // Second download should fail due to daily limit
      mockArrayBuffer();
      const downloadResult2 = await mirrorsManager.downloadOsuBeatmap({
        beatmapId: 2,
      });
      expect(downloadResult2.status).toBe(502);

      // But getBeatmap should still work (different daily limit)
      // Use generateBeatmap with set: null to avoid nested beatmapset conversion issues
      Mocker.mockRequest(testClient, "baseApi", "get", {
        data: generateBeatmap({ id: 100, set: null }),
        status: 200,
        headers: {},
      });
      const beatmapResult = await mirrorsManager.getBeatmap({
        beatmapId: 100,
      });
      expect(beatmapResult.status).toBe(200);
    });

    test("Global daily limit should apply when no ability-specific limit matches", async () => {
      config.DisableDailyRateLimit = false;
      config.DisableSafeRatelimitMode = true;

      // Create a custom client with only ability-specific limits (no global)
      const TestableMinoClient = class extends MinoClient {
        constructor(storageManager: any) {
          super(storageManager);
          // @ts-expect-error accessing protected property for testing
          this.api._config.dailyRateLimits = [
            { limit: 1, abilities: [ClientAbilities.DownloadOsuBeatmap] },
            { limit: 1000 }, // Global fallback
          ];
        }
      };

      config.MirrorsToIgnore = mirrors
        .filter(m => m !== MinoClient)
        .map(m => m.name.slice(0, -6).toLowerCase());

      mirrorsManager = new MirrorsManager(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      mirrorsManager.clients[0].client = new TestableMinoClient(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      const testClient = mirrorsManager.clients[0].client;

      const { generateBeatmap } = Mocker.getClientGenerateMethods(testClient);

      // GetBeatmap uses global limit (1000), should work many times
      // Start from 1 to avoid falsy beatmapId
      // Use set: null to avoid nested beatmapset conversion issues
      for (let i = 1; i <= 5; i++) {
        Mocker.mockRequest(testClient, "baseApi", "get", {
          data: generateBeatmap({ id: i, set: null }),
          status: 200,
          headers: {},
        });
        const result = await mirrorsManager.getBeatmap({
          beatmapId: i,
        });
        expect(result.status).toBe(200);
      }
    });

    test("Both specific AND global limits should be decremented when ability has both", async () => {
      config.DisableDailyRateLimit = false;
      config.DisableSafeRatelimitMode = true;

      // Create a client with BOTH a specific limit for DownloadOsuBeatmap AND a global limit
      // Both should be decremented when using DownloadOsuBeatmap
      const TestableMinoClient = class extends MinoClient {
        constructor(storageManager: any) {
          super(storageManager);
          // @ts-expect-error accessing protected property for testing
          this.api._config.dailyRateLimits = [
            { limit: 5, abilities: [ClientAbilities.DownloadOsuBeatmap] }, // Specific: 5 requests
            { limit: 3 }, // Global: 3 requests - this is the bottleneck
          ];
          // Pre-initialize the in-memory cache to avoid Redis state pollution from other tests
          // @ts-expect-error accessing private property for testing
          this.api.dailyLimits.set(`${ClientAbilities.DownloadOsuBeatmap}`, {
            requestsLeft: 5,
            expiresAt: Date.now() + 86400000,
          });
          // @ts-expect-error accessing private property for testing
          this.api.dailyLimits.set("global", {
            requestsLeft: 3,
            expiresAt: Date.now() + 86400000,
          });
        }
      };

      config.MirrorsToIgnore = mirrors
        .filter(m => m !== MinoClient)
        .map(m => m.name.slice(0, -6).toLowerCase());

      mirrorsManager = new MirrorsManager(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      mirrorsManager.clients[0].client = new TestableMinoClient(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      const testClient = mirrorsManager.clients[0].client;

      const { mockArrayBuffer } = Mocker.getClientMockMethods(testClient);

      // Should be able to do 3 requests (limited by global limit of 3)
      for (let i = 1; i <= 3; i++) {
        mockArrayBuffer();
        const result = await mirrorsManager.downloadOsuBeatmap({
          beatmapId: i,
        });
        expect(result.status).toBe(200);
      }

      // 4th request should fail because global limit (3) is exhausted
      // even though specific limit (5) still has capacity
      mockArrayBuffer();
      const result4 = await mirrorsManager.downloadOsuBeatmap({
        beatmapId: 4,
      });
      expect(result4.status).toBe(502);
    });

    test("Either global OR specific limit exhaustion should block the ability", async () => {
      config.DisableDailyRateLimit = false;
      config.DisableSafeRatelimitMode = true;

      // Create a client where specific limit is lower than global
      const TestableMinoClient = class extends MinoClient {
        constructor(storageManager: any) {
          super(storageManager);
          // @ts-expect-error accessing protected property for testing
          this.api._config.dailyRateLimits = [
            { limit: 2, abilities: [ClientAbilities.DownloadOsuBeatmap] }, // Specific: 2 requests - bottleneck
            { limit: 100 }, // Global: plenty of capacity
          ];
          // Pre-initialize the in-memory cache to avoid Redis state pollution from other tests
          // @ts-expect-error accessing private property for testing
          this.api.dailyLimits.set(`${ClientAbilities.DownloadOsuBeatmap}`, {
            requestsLeft: 2,
            expiresAt: Date.now() + 86400000,
          });
          // @ts-expect-error accessing private property for testing
          this.api.dailyLimits.set("global", {
            requestsLeft: 100,
            expiresAt: Date.now() + 86400000,
          });
        }
      };

      config.MirrorsToIgnore = mirrors
        .filter(m => m !== MinoClient)
        .map(m => m.name.slice(0, -6).toLowerCase());

      mirrorsManager = new MirrorsManager(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      mirrorsManager.clients[0].client = new TestableMinoClient(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      const testClient = mirrorsManager.clients[0].client;

      const { mockArrayBuffer } = Mocker.getClientMockMethods(testClient);

      // Should be able to do 2 requests (limited by specific limit of 2)
      for (let i = 1; i <= 2; i++) {
        mockArrayBuffer();
        const result = await mirrorsManager.downloadOsuBeatmap({
          beatmapId: i,
        });
        expect(result.status).toBe(200);
      }

      // 3rd request should fail because specific limit (2) is exhausted
      // even though global limit (100) still has capacity
      mockArrayBuffer();
      const result3 = await mirrorsManager.downloadOsuBeatmap({
        beatmapId: 3,
      });
      expect(result3.status).toBe(502);
    });

    test("Non-applicable daily limits should NOT be decremented for unrelated abilities", async () => {
      config.DisableDailyRateLimit = false;
      config.DisableSafeRatelimitMode = true;

      // Create a client with a specific limit for download abilities AND a global limit
      const TestableMinoClient = class extends MinoClient {
        constructor(storageManager: any) {
          super(storageManager);
          // @ts-expect-error accessing protected property for testing
          this.api._config.dailyRateLimits = [
            { limit: 100, abilities: [ClientAbilities.DownloadOsuBeatmap, ClientAbilities.DownloadBeatmapSetById] }, // Download-specific
            { limit: 1000 }, // Global
          ];
          // Pre-initialize the in-memory cache
          // @ts-expect-error accessing private property for testing
          this.api.dailyLimits.set(`${ClientAbilities.DownloadOsuBeatmap},${ClientAbilities.DownloadBeatmapSetById}`.split(",").sort((a, b) => Number(a) - Number(b)).join(","), {
            requestsLeft: 100,
            expiresAt: Date.now() + 86400000,
          });
          // @ts-expect-error accessing private property for testing
          this.api.dailyLimits.set("global", {
            requestsLeft: 1000,
            expiresAt: Date.now() + 86400000,
          });
        }
      };

      config.MirrorsToIgnore = mirrors
        .filter(m => m !== MinoClient)
        .map(m => m.name.slice(0, -6).toLowerCase());

      mirrorsManager = new MirrorsManager(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      mirrorsManager.clients[0].client = new TestableMinoClient(mockStorageManager);

      // @ts-expect-error accessing protected property for testing
      const testClient = mirrorsManager.clients[0].client;

      const { generateBeatmap } = Mocker.getClientGenerateMethods(testClient);

      // Make GetBeatmap requests (non-download ability)
      for (let i = 1; i <= 5; i++) {
        Mocker.mockRequest(testClient, "baseApi", "get", {
          data: generateBeatmap({ id: i, set: null }),
          status: 200,
          headers: {},
        });
        const result = await mirrorsManager.getBeatmap({
          beatmapId: i,
        });
        expect(result.status).toBe(200);
      }

      // Verify the download-specific limit was NOT decremented (should still be 100)
      const downloadLimitKey = `${ClientAbilities.DownloadOsuBeatmap},${ClientAbilities.DownloadBeatmapSetById}`.split(",").sort((a, b) => Number(a) - Number(b)).join(",");
      // @ts-expect-error accessing private property for testing
      const downloadLimit = testClient.api.dailyLimits.get(downloadLimitKey);
      expect(downloadLimit?.requestsLeft).toBe(100); // Unchanged!

      // Verify the global limit WAS decremented (should be 1000 - 5 = 995)
      // @ts-expect-error accessing private property for testing
      const globalLimit = testClient.api.dailyLimits.get("global");
      expect(globalLimit?.requestsLeft).toBe(995); // Decremented by 5
    });
  });
});
