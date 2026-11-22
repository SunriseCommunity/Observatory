import config from "@observatory/common/config";
import type { BeatmapOsuFile, BeatmapsetFile } from "@observatory/common/database/schema";
import { RedisInstance } from "@observatory/common/redis/redis";
import type { Beatmap, Beatmapset } from "@observatory/common/types/beatmap";
import type {
  DownloadBeatmapSetOptions,
  DownloadOsuBeatmap,
  GetBeatmapOptions,
  GetBeatmapSetOptions,
  SearchBeatmapsetsOptions,
} from "@observatory/common/types/beatmap-query";
import { RankStatus } from "@observatory/common/types/rankStatus";
import { RedisKeys } from "@observatory/common/types/redis";

const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_SECOND = 1000;

function getSearchResultKey(ctx: SearchBeatmapsetsOptions) {
  const key = JSON.stringify([ctx.query, ctx.limit, ctx.offset, ctx.status, ctx.mode]);
  return `${RedisKeys.BEATMAPS_SEARCH_RESULT}${Bun.hash(key)}`;
}

function getRedisTTLBasedOnStatus(status?: RankStatus): number {
  const ONE_MINUTE = 1000 * 60;

  switch (status) {
    case RankStatus.GRAVEYARD:
      return ONE_MINUTE * 30;
    case RankStatus.PENDING:
    case RankStatus.QUALIFIED:
    case RankStatus.WIP:
      return ONE_MINUTE * 5;
    case RankStatus.APPROVED:
    case RankStatus.LOVED:
    case RankStatus.RANKED:
      return ONE_MINUTE * 15;
    default:
      return ONE_MINUTE * 5;
  }
}

export abstract class StorageCacheRepository {
  static async getBeatmap(
    ctx: GetBeatmapOptions,
  ): Promise<Beatmap | null | undefined> {
    if (!ctx.beatmapId && !ctx.beatmapHash && !ctx.beatmapFilename) {
      throw new Error("Either beatmapId, beatmapHash or beatmapFilename is required");
    }

    let { beatmapId } = ctx;

    if (ctx.beatmapHash) {
      const cachedId = await RedisInstance.get(
        `${RedisKeys.BEATMAP_ID_BY_HASH}${ctx.beatmapHash}`,
      );

      if (!cachedId)
        return undefined;
      if (cachedId === "null")
        return null;

      beatmapId = Number(cachedId);
    }

    if (ctx.beatmapFilename) {
      const cachedId = await RedisInstance.get(
        `${RedisKeys.BEATMAP_ID_BY_FILENAME}${ctx.beatmapFilename}`,
      );

      if (!cachedId)
        return undefined;
      if (cachedId === "null")
        return null;

      beatmapId = Number(cachedId);
    }

    const cache = await RedisInstance.get(
            `${RedisKeys.BEATMAP_BY_ID}${beatmapId}`,
    );

    return cache ? JSON.parse(cache) : undefined;
  }

  static async insertEmptyBeatmap(ctx: GetBeatmapOptions) {
    let key = "";

    if (ctx?.beatmapId) {
      key = `${RedisKeys.BEATMAP_BY_ID}${ctx?.beatmapId}`;
    }
    else if (ctx?.beatmapHash) {
      key = `${RedisKeys.BEATMAP_ID_BY_HASH}${ctx?.beatmapHash}`;
    }
    else if (ctx?.beatmapFilename) {
      key = `${RedisKeys.BEATMAP_ID_BY_FILENAME}${ctx?.beatmapFilename}`;
    }

    await RedisInstance.set(
      key,
      "null",
      "PX",
      getRedisTTLBasedOnStatus(),
    );
  }

  static async insertBeatmap(beatmap: Beatmap) {
    await RedisInstance.set(
            `${RedisKeys.BEATMAP_BY_ID}${beatmap.id}`,
            JSON.stringify(beatmap),
            "PX",
            getRedisTTLBasedOnStatus(beatmap.status),
    );

    await RedisInstance.set(
            `${RedisKeys.BEATMAP_ID_BY_HASH}${beatmap.checksum}`,
            beatmap.id,
            "PX",
            getRedisTTLBasedOnStatus(beatmap.status),
    );
  }

  static async insertBeatmapByFilename(beatmap: Beatmap, filename: string) {
    await RedisInstance.set(
      `${RedisKeys.BEATMAP_ID_BY_FILENAME}${filename}`,
      beatmap.id,
      "PX",
      getRedisTTLBasedOnStatus(beatmap.status),
    );
  }

  static async insertEmptyBeatmapset(ctx: GetBeatmapSetOptions) {
    const key = `${RedisKeys.BEATMAPSET_BY_ID}${ctx?.beatmapSetId}`;
    await RedisInstance.set(
      key,
      "null",
      "PX",
      getRedisTTLBasedOnStatus(),
    );
  }

  static async insertBeatmapset(beatmapset: Beatmapset) {
    await RedisInstance.set(
            `${RedisKeys.BEATMAPSET_BY_ID}${beatmapset.id}`,
            JSON.stringify(beatmapset),
            "PX",
            getRedisTTLBasedOnStatus(beatmapset.status),
    );

    await Promise.all(beatmapset.beatmaps?.map(b => StorageCacheRepository.insertBeatmap(b)) ?? []);
  }

  static async getBeatmapSet(
    ctx: GetBeatmapSetOptions,
  ): Promise<Beatmapset | null | undefined> {
    const beatmapsetId = ctx.beatmapSetId;

    const cache = await RedisInstance.get(
            `${RedisKeys.BEATMAPSET_BY_ID}${beatmapsetId}`,
    );

    return cache ? JSON.parse(cache) : undefined;
  }

  static async insertSearchResult(
    ctx: SearchBeatmapsetsOptions,
    result: Beatmapset[],
  ) {
    await RedisInstance.set(
      getSearchResultKey(ctx),
      JSON.stringify(result),
      "PX",
      ONE_SECOND * 15,
    );
  }

  static async getSearchResult(
    ctx: SearchBeatmapsetsOptions,
  ): Promise<Beatmapset[] | undefined> {
    const cache = await RedisInstance.get(getSearchResultKey(ctx));

    return cache ? JSON.parse(cache) : undefined;
  }

  static async insertEmptyBeatmapsetFile(ctx: DownloadBeatmapSetOptions) {
    const key = `${RedisKeys.BEATMAPSET_FILE_BY_ID}${ctx.beatmapSetId}`;
    await RedisInstance.set(
      key,
      "null",
      "PX",
      getRedisTTLBasedOnStatus(),
    );
  }

  static async insertBeatmapsetFile(
    ctx: DownloadBeatmapSetOptions,
    beatmapsetFile: BeatmapsetFile,
  ) {
    await RedisInstance.set(
            `${RedisKeys.BEATMAPSET_FILE_BY_ID}${ctx.beatmapSetId}`,
            JSON.stringify(beatmapsetFile),
            "PX",
            (ONE_DAY / 24) * config.OSZ_FILES_LIFE_SPAN,
    );
  }

  static async getBeatmapSetFile(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<BeatmapsetFile | null | undefined> {
    const beatmapsetId = ctx.beatmapSetId;

    const cache = await RedisInstance.get(
            `${RedisKeys.BEATMAPSET_FILE_BY_ID}${beatmapsetId}`,
    );

    return cache ? JSON.parse(cache) : undefined;
  }

  static async insertEmptyBeatmapOsuFile(ctx: DownloadOsuBeatmap) {
    const key = `${RedisKeys.BEATMAP_OSU_FILE}${ctx.beatmapId}`;
    await RedisInstance.set(
      key,
      "null",
      "PX",
      getRedisTTLBasedOnStatus(),
    );
  }

  static async insertBeatmapOsuFile(
    ctx: DownloadOsuBeatmap,
    beatmapOsuFile: BeatmapOsuFile,
  ) {
    await RedisInstance.set(
            `${RedisKeys.BEATMAP_OSU_FILE}${ctx.beatmapId}`,
            JSON.stringify(beatmapOsuFile),
            "PX",
            (ONE_DAY / 24) * config.OSZ_FILES_LIFE_SPAN, // Let .osu files live for the same time as .osz files
    );
  }

  static async getBeatmapOsuFile(
    ctx: DownloadOsuBeatmap,
  ): Promise<BeatmapOsuFile | null | undefined> {
    const cache = await RedisInstance.get(
            `${RedisKeys.BEATMAP_OSU_FILE}${ctx.beatmapId}`,
    );

    return cache ? JSON.parse(cache) : undefined;
  }

  static async getRedisStats() {
    const beatmapsByIdKeys = await RedisInstance.keys(
      `${RedisKeys.BEATMAP_BY_ID}*`,
    );
    const beatmapsIdByHashKeys = await RedisInstance.keys(
      `${RedisKeys.BEATMAP_ID_BY_HASH}*`,
    );

    const beatmapsetsByIdKeys = await RedisInstance.keys(
      `${RedisKeys.BEATMAPSET_BY_ID}*`,
    );

    const beatmapsetFilesByIdKeys = await RedisInstance.keys(
      `${RedisKeys.BEATMAPSET_FILE_BY_ID}*`,
    );

    const beatmapOsuFilesByIdKeys = await RedisInstance.keys(
      `${RedisKeys.BEATMAP_OSU_FILE}*`,
    );

    return {
      beatmaps: {
        byId: beatmapsByIdKeys.length,
        ids: {
          byHash: beatmapsIdByHashKeys.length,
        },
      },
      beatmapsets: {
        byId: beatmapsetsByIdKeys.length,
      },
      beatmapsetFiles: {
        byId: beatmapsetFilesByIdKeys.length,
      },
      beatmapOsuFiles: {
        byId: beatmapOsuFilesByIdKeys.length,
      },
    };
  }
}
