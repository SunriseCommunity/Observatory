import path from "node:path";

import type { AxiosResponse } from "axios";
import type { Mock } from "bun:test";
import { spyOn } from "bun:test";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { BaseApi } from "../../src/core/abstracts/api/base-api.abstract";
import type { BaseClient } from "../../src/core/abstracts/client/base-client.abstract";
import type { ApiRateLimiter } from "../../src/core/abstracts/ratelimiter/rate-limiter.abstract";
import { BanchoClient } from "../../src/core/domains";
import { OsulabsClient } from "../../src/core/domains/beatmaps.download/osulabs.client";
import type {
  OsulabsBeatmap,
  OsulabsBeatmapset,
} from "../../src/core/domains/beatmaps.download/osulabs-client.types";
import { MinoClient } from "../../src/core/domains/catboy.best/mino.client";
import type {
  MinoBeatmap,
  MinoBeatmapset,
} from "../../src/core/domains/catboy.best/mino-client.types";
import type { BanchoService } from "../../src/core/domains/osu.ppy.sh/bancho-client.service";
import { MirrorsManagerService } from "../../src/core/managers/mirrors/mirrors-manager.service";
import { db } from "../../src/database/client";
import { RedisInstance } from "../../src/plugins/redisInstance";
import type { Beatmap, Beatmapset } from "../../src/types/general/beatmap";
import type { DeepPartial } from "../../src/types/utils";
import { FakerGenerator } from "./faker.generator";

type MockAxiosResponse<T> = Partial<AxiosResponse<T>> & {
  data: T;
  status: number;
  headers?: Record<string, string>;
};

// eslint-disable-next-line unicorn/no-static-only-class -- Used for methods overloading
export class Mocker {
  static mockRequest<T>(
    baseClient: BaseClient,
    service: "self",
    mockedEndpointMethod: keyof BaseClient,
    data: MockAxiosResponse<T>,
  ): Mock<never>;
  static mockRequest<T>(
    baseClient: BaseClient,
    service: "api",
    mockedEndpointMethod: keyof ApiRateLimiter,
    data: MockAxiosResponse<T>,
  ): Mock<never>;
  static mockRequest<T>(
    baseClient: BaseClient,
    service: "baseApi",
    mockedEndpointMethod: keyof BaseApi,
    data: MockAxiosResponse<T>,
  ): Mock<never>;
  static mockRequest<_T>(
    baseClient: BaseClient,
    service: "banchoService",
    mockedEndpointMethod: keyof BanchoService,
    data: string,
  ): Mock<never>;
  static mockRequest<T>(
    baseClient: BaseClient,
    service: "self" | "api" | "baseApi" | "banchoService",
    mockedEndpointMethod:
      | keyof BaseClient
      | keyof BaseApi
      | keyof ApiRateLimiter
      | keyof BanchoService,
    data: MockAxiosResponse<T> | string,
  ) {
    if (service === "api") {
      return spyOn(
        // @ts-expect-error ignore protected property
        baseClient.api,
        mockedEndpointMethod as keyof ApiRateLimiter,
      ).mockResolvedValue(data as never);
    }

    if (service === "baseApi") {
      return spyOn(
        // @ts-expect-error ignore protected property
        baseClient.api.api,
        mockedEndpointMethod as keyof BaseApi,
      ).mockResolvedValue(data as never);
    }

    if (service === "self") {
      return spyOn(
        baseClient,
        mockedEndpointMethod as keyof BaseClient,
      ).mockResolvedValue(data as never);
    }

    if (service === "banchoService" && baseClient instanceof BanchoClient) {
      return spyOn(
        // @ts-expect-error ignore protected property
        baseClient.banchoService,
        mockedEndpointMethod as keyof BanchoService,
      ).mockResolvedValue(data as never);
    }

    throw new Error("Invalid service to mock");
  }

  static mockSyncRequest<T>(
    baseClient: BaseClient,
    service: "self",
    mockedEndpointMethod: keyof BaseClient,
    data: T,
  ): Mock<never>;
  static mockSyncRequest<T>(
    baseClient: BaseClient,
    service: "api",
    mockedEndpointMethod: keyof ApiRateLimiter,
    data: T,
  ): Mock<never>;
  static mockSyncRequest<T>(
    baseClient: BaseClient,
    service: "baseApi",
    mockedEndpointMethod: keyof BaseApi,
    data: T,
  ): Mock<never>;
  static mockSyncRequest<T>(
    baseClient: BaseClient,
    service: "self" | "api" | "baseApi",
    mockedEndpointMethod:
      | keyof BaseClient
      | keyof BaseApi
      | keyof ApiRateLimiter,
    data: T,
  ) {
    if (service === "api") {
      return spyOn(
        // @ts-expect-error ignore protected property
        baseClient.api,
        mockedEndpointMethod as keyof ApiRateLimiter,
      ).mockReturnValue(data as never);
    }

    if (service === "baseApi") {
      return spyOn(
        // @ts-expect-error ignore protected property
        baseClient.api.api,
        mockedEndpointMethod as keyof BaseApi,
      ).mockReturnValue(data as never);
    }

    if (service === "self") {
      return spyOn(
        baseClient,
        mockedEndpointMethod as keyof BaseClient,
      ).mockReturnValue(data as never);
    }

    throw new Error("Invalid service to mock");
  }

  static mockApiRequestForAllClients<T>(
    mockedEndpointMethod: keyof BaseApi,
    data: AxiosResponse<T>,
  ) {
    return spyOn(BaseApi.prototype, mockedEndpointMethod).mockResolvedValue(
      data,
    );
  }

  // TODO: Add ability to mock database for unit tests
  static async ensureDatabaseInitialized() {
    const migrationPath = path.join(
      process.cwd(),
      "server/src/database/migrations",
    );

    try {
      await migrate(db, {
        migrationsFolder: migrationPath,
      });
    }
    catch {
      throw new Error("Failed to migrate the database for testing");
    }

    await RedisInstance.flushdb();
  }

  static mockMirrorsBenchmark() {
    spyOn(
      MirrorsManagerService.prototype,
      "fetchMirrorsData",
    ).mockResolvedValue();
  }

  static getClientGenerateMethods(client: BaseClient) {
    switch (client.constructor) {
      case MinoClient:
        return {
          generateBeatmap: (options?: DeepPartial<MinoBeatmap>) =>
            FakerGenerator.generateMinoBeatmap(options),
          generateBeatmapset: (
            options?: DeepPartial<MinoBeatmapset>,
          ) => FakerGenerator.generateMinoBeatmapset(options),
          generateArrayBuffer: () => new ArrayBuffer(1024),
        };
      case OsulabsClient:
        return {
          generateBeatmap: (options?: DeepPartial<OsulabsBeatmap>) =>
            FakerGenerator.generateOsulabsBeatmap(options),
          generateBeatmapset: (
            options?: DeepPartial<OsulabsBeatmapset>,
          ) => FakerGenerator.generateOsulabsBeatmapset(options),
          generateArrayBuffer: () => new ArrayBuffer(1024),
        };
      default:
        return {
          generateBeatmap: (options?: DeepPartial<Beatmap>) =>
            FakerGenerator.generateBeatmap(options),
          generateBeatmapset: (options?: DeepPartial<Beatmapset>) =>
            FakerGenerator.generateBeatmapset(options),
          generateArrayBuffer: () => new ArrayBuffer(1024),
        };
    }
  }

  static getClientMockMethods<T>(client: BaseClient) {
    const generators = this.getClientGenerateMethods(client);

    return {
      mockBeatmap: (options?: Partial<MockApiRequestOptions<T>>) =>
        this.mockRequest(client, "baseApi", "get", {
          status: 200,
          headers: {},
          ...options,
          data: generators.generateBeatmap(options?.data),
        }),
      mockBeatmapset: (options?: Partial<MockApiRequestOptions<T>>) =>
        this.mockRequest(client, "baseApi", "get", {
          status: 200,
          headers: {},
          ...options,
          data: generators.generateBeatmapset(options?.data),
        }),
      mockArrayBuffer: () =>
        this.mockRequest(client, "baseApi", "get", {
          status: 200,
          headers: {},
          data: generators.generateArrayBuffer(),
        }),
    };
  }
}

type MockApiRequestOptions<T> = {
  data: DeepPartial<T>;
  status: number;
  headers: Record<string, string>;
};
