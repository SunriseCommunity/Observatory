import {
    DownloadBeatmapSetOptions,
    DownloadOsuBeatmap,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    SearchBeatmapsetsOptions,
} from '../../abstracts/client/base-client.types';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import Redis from 'ioredis';
import { RedisKeys } from '../../../types/redis';
import { RankStatus } from '../../../types/general/rankStatus';
import config from '../../../config';
import { BeatmapOsuFile, BeatmapsetFile } from '../../../database/schema';
import { RedisInstance } from '../../../plugins/redisInstance';

const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_SECOND = 1000;

export class StorageCacheService {
    private readonly redis: Redis = RedisInstance;

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<Beatmap | null | undefined> {
        let beatmapId = ctx.beatmapId;

        if (ctx.beatmapHash) {
            const cachedId = await this.redis.get(
                `${RedisKeys.BEATMAP_ID_BY_HASH}${ctx.beatmapHash}`,
            );

            if (!cachedId) return undefined;
            if (cachedId === 'null') return null;

            beatmapId = Number(cachedId);
        }

        const cache = await this.redis.get(
            `${RedisKeys.BEATMAP_BY_ID}${beatmapId}`,
        );

        return cache ? JSON.parse(cache) : undefined;
    }

    async insertEmptyBeatmap(ctx: GetBeatmapOptions) {
        const key = ctx?.beatmapId
            ? `${RedisKeys.BEATMAP_BY_ID}${ctx?.beatmapId}`
            : `${RedisKeys.BEATMAP_ID_BY_HASH}${ctx?.beatmapHash}`;
        await this.redis.set(
            key,
            'null',
            'PX',
            this.getRedisTTLBasedOnStatus(),
        );
        return;
    }

    async insertBeatmap(beatmap: Beatmap) {
        await this.redis.set(
            `${RedisKeys.BEATMAP_BY_ID}${beatmap.id}`,
            JSON.stringify(beatmap),
            'PX',
            this.getRedisTTLBasedOnStatus(beatmap.status),
        );

        await this.redis.set(
            `${RedisKeys.BEATMAP_ID_BY_HASH}${beatmap.checksum}`,
            beatmap.id,
            'PX',
            this.getRedisTTLBasedOnStatus(beatmap.status),
        );
    }

    async insertEmptyBeatmapset(ctx: GetBeatmapSetOptions) {
        const key = `${RedisKeys.BEATMAPSET_BY_ID}${ctx?.beatmapSetId}`;
        await this.redis.set(
            key,
            'null',
            'PX',
            this.getRedisTTLBasedOnStatus(),
        );
        return;
    }

    async insertBeatmapset(beatmapset: Beatmapset) {
        await this.redis.set(
            `${RedisKeys.BEATMAPSET_BY_ID}${beatmapset.id}`,
            JSON.stringify(beatmapset),
            'PX',
            this.getRedisTTLBasedOnStatus(beatmapset.status),
        );

        beatmapset.beatmaps?.forEach((b) => this.insertBeatmap(b));
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<Beatmapset | null | undefined> {
        let beatmapsetId = ctx.beatmapSetId;

        const cache = await this.redis.get(
            `${RedisKeys.BEATMAPSET_BY_ID}${beatmapsetId}`,
        );

        return cache ? JSON.parse(cache) : undefined;
    }

    async insertSearchResult(
        ctx: SearchBeatmapsetsOptions,
        result: Beatmapset[],
    ) {
        const requestRawKey = Object.values(ctx)
            .reduce((p, v, i) => `${p}indx-${i}:${(v ?? '').toString()}:`, '')
            .toString();
        const requestKey = Bun.hash(requestRawKey).toString();

        await this.redis.set(
            `${RedisKeys.BEATMAPS_SEARCH_RESULT}${requestKey}`,
            JSON.stringify(result),
            'PX',
            ONE_SECOND * 15,
        );
    }

    async getSearchResult(
        ctx: SearchBeatmapsetsOptions,
    ): Promise<Beatmapset[] | undefined> {
        const requestRawKey = Object.values(ctx)
            .reduce((p, v, i) => `${p}indx-${i}:${(v ?? '').toString()}:`, '')
            .toString();
        const requestKey = Bun.hash(requestRawKey).toString();

        const cache = await this.redis.get(
            `${RedisKeys.BEATMAPS_SEARCH_RESULT}${requestKey}`,
        );

        return cache ? JSON.parse(cache) : undefined;
    }

    async insertEmptyBeatmapsetFile(ctx: DownloadBeatmapSetOptions) {
        const key = `${RedisKeys.BEATMAPSET_FILE_BY_ID}${ctx.beatmapSetId}`;
        await this.redis.set(
            key,
            'null',
            'PX',
            this.getRedisTTLBasedOnStatus(),
        );
        return;
    }

    async insertBeatmapsetFile(
        ctx: DownloadBeatmapSetOptions,
        beatmapsetFile: BeatmapsetFile,
    ) {
        await this.redis.set(
            `${RedisKeys.BEATMAPSET_FILE_BY_ID}${ctx.beatmapSetId}`,
            JSON.stringify(beatmapsetFile),
            'PX',
            (ONE_DAY / 24) * config.OSZ_FILES_LIFE_SPAN,
        );
    }

    async getBeatmapSetFile(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<BeatmapsetFile | null | undefined> {
        let beatmapsetId = ctx.beatmapSetId;

        const cache = await this.redis.get(
            `${RedisKeys.BEATMAPSET_FILE_BY_ID}${beatmapsetId}`,
        );

        return cache ? JSON.parse(cache) : undefined;
    }

    async insertEmptyBeatmapOsuFile(ctx: DownloadOsuBeatmap) {
        const key = `${RedisKeys.BEATMAP_OSU_FILE}${ctx.beatmapId}`;
        await this.redis.set(
            key,
            'null',
            'PX',
            this.getRedisTTLBasedOnStatus(),
        );
        return;
    }

    async insertBeatmapOsuFile(
        ctx: DownloadOsuBeatmap,
        beatmapOsuFile: BeatmapOsuFile,
    ) {
        await this.redis.set(
            `${RedisKeys.BEATMAP_OSU_FILE}${ctx.beatmapId}`,
            JSON.stringify(beatmapOsuFile),
            'PX',
            (ONE_DAY / 24) * config.OSZ_FILES_LIFE_SPAN, // Let .osu files live for the same time as .osz files
        );
    }

    async getBeatmapOsuFile(
        ctx: DownloadOsuBeatmap,
    ): Promise<BeatmapOsuFile | null | undefined> {
        const cache = await this.redis.get(
            `${RedisKeys.BEATMAP_OSU_FILE}${ctx.beatmapId}`,
        );

        return cache ? JSON.parse(cache) : undefined;
    }

    async getRedisStats() {
        const beatmapsByIdKeys = await this.redis.keys(
            RedisKeys.BEATMAP_BY_ID + '*',
        );
        const beatmapsIdByHashKeys = await this.redis.keys(
            RedisKeys.BEATMAP_ID_BY_HASH + '*',
        );

        const beatmapsetsByIdKeys = await this.redis.keys(
            RedisKeys.BEATMAPSET_BY_ID + '*',
        );

        const beatmapsetFilesByIdKeys = await this.redis.keys(
            RedisKeys.BEATMAPSET_FILE_BY_ID + '*',
        );

        const beatmapOsuFilesByIdKeys = await this.redis.keys(
            RedisKeys.BEATMAP_OSU_FILE + '*',
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

    private getRedisTTLBasedOnStatus(status?: RankStatus): number {
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
}
