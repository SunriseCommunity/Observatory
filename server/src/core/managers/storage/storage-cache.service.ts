import {
    GetBeatmapOptions,
    GetBeatmapSetOptions,
} from '../../abstracts/client/base-client.types';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import Redis from 'ioredis';
import { RedisKeys } from '../../../types/redis';
import { RankStatus } from '../../../types/general/rankStatus';
import config from '../../../config';

const ONE_DAY = 1000 * 60 * 60 * 24;

export class StorageCacheService {
    private readonly redis: Redis = new Redis({
        port: config.REDIS_PORT,
    });

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

    private getRedisTTLBasedOnStatus(status?: RankStatus): number {
        switch (status) {
            case RankStatus.GRAVEYARD:
                return ONE_DAY * 2; // 2 days
            case RankStatus.WIP || RankStatus.PENDING || RankStatus.QUALIFIED:
                return 1000 * 60 * 5; // 5 minutes
            case RankStatus.RANKED || RankStatus.APPROVED || RankStatus.LOVED:
                return ONE_DAY; // 1 day
            default:
                return 1000 * 60 * 5; // 5 minutes
        }
    }
}
