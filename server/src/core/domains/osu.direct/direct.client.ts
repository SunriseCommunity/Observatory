import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    ResultWithStatus,
} from '../../abstracts/client/base-client.types';
import { Beatmap, Beatmapset } from '../../../types/beatmap';
import { DirectBeatmap, DirectBeatmapSet } from './direct-client.types';
import logger from '../../../utils/logger';

export class DirectClient extends BaseClient {
    constructor() {
        super(
            {
                baseUrl: 'https://osu.direct/api',
                abilities: [
                    ClientAbilities.GetBeatmapById,
                    ClientAbilities.GetBeatmapBySetId,
                    ClientAbilities.GetBeatmapByHash,
                    ClientAbilities.GetBeatmapSetById,
                    ClientAbilities.GetBeatmapSetByBeatmapId,
                    ClientAbilities.GetBeatmapSetByBeatmapHash,
                    ClientAbilities.DownloadBeatmapSetById,
                    ClientAbilities.DownloadBeatmapSetByIdNoVideo,
                ],
            },
            {
                headers: {
                    remaining: 'ratelimit-remaining',
                    reset: 'ratelimit-reset',
                    limit: 'ratelimit-limit',
                },
                rateLimits: [
                    {
                        routes: ['/'],
                        limit: 50,
                        reset: 60,
                    },
                ],
            },
        );

        logger.info('DirectClient initialized');
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        if (ctx.beatmapSetId) {
            return await this.getBeatmapSetById(ctx.beatmapSetId);
        }

        throw new Error('Invalid arguments');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        if (ctx.beatmapId) {
            return await this.getBeatmapById(ctx.beatmapId);
        } else if (ctx.beatmapHash) {
            return await this.getBeatmapByHash(ctx.beatmapHash);
        }

        throw new Error('Invalid arguments');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer | null>> {
        const result = await this.api.get<ArrayBuffer>(
            `d/${ctx.beatmapSetId}`,
            {
                config: {
                    responseType: 'arraybuffer',
                    params: {
                        noVideo: ctx.noVideo ? true : undefined,
                    },
                },
            },
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return { result: result.data, status: result.status };
    }

    private async getBeatmapSetById(
        beatmapSetId: number,
    ): Promise<ResultWithStatus<Beatmapset | null>> {
        const result = await this.api.get<DirectBeatmapSet>(
            `v2/s/${beatmapSetId}`,
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertBeatmapSet(result.data),
            status: result.status,
        };
    }

    private async getBeatmapById(
        beatmapId: number,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        const result = await this.api.get<DirectBeatmap>(`v2/b/${beatmapId}`);

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertBeatmap(result.data),
            status: result.status,
        };
    }

    private async getBeatmapByHash(
        beatmapHash: string,
    ): Promise<ResultWithStatus<Beatmap | null>> {
        const result = await this.api.get<DirectBeatmap>(
            `v2/md5/${beatmapHash}`,
        );

        if (!result || result.status !== 200) {
            return { result: null, status: result?.status ?? 500 };
        }

        return {
            result: this.convertBeatmap(result.data),
            status: result.status,
        };
    }

    private convertBeatmap(beatmap: DirectBeatmap): Beatmap {
        return {
            beatmapset_id: beatmap.beatmapset_id,
            id: beatmap.id,
            mode: beatmap.mode as any,
            difficulty_rating: beatmap.difficulty_rating,
            version: beatmap.version,
            total_length: beatmap.total_length,
            hit_length: beatmap.hit_length,
            bpm: beatmap.bpm,
            max_combo: beatmap.max_combo,
            playcount: beatmap.playcount,
            passcount: beatmap.passcount,
            count_circles: beatmap.count_circles,
            count_sliders: beatmap.count_sliders,
            count_spinners: beatmap.count_spinners,
            is_scoreable: beatmap.is_scoreable,
            last_updated: beatmap.last_updated,
            accuracy: beatmap.accuracy,
            ar: beatmap.ar,
            cs: beatmap.cs,
            drain: beatmap.drain,
            convert: beatmap.convert,
            mode_int: beatmap.mode_int,
            deleted_at: beatmap.deleted_at,
            user_id: beatmap.user_id,
            status: beatmap.status as any,
            ranked: beatmap.ranked,
            url: beatmap.url,
            checksum: beatmap.checksum,
        };
    }

    private convertBeatmapSet(beatmapSet: DirectBeatmapSet): Beatmapset {
        return {
            id: beatmapSet.id,
            title: beatmapSet.title,
            artist: beatmapSet.artist,
            creator: beatmapSet.creator,
            favourite_count: beatmapSet.favourite_count,
            play_count: beatmapSet.play_count,
            preview_url: beatmapSet.preview_url,
            source: beatmapSet.source,
            status: beatmapSet.status,
            user_id: beatmapSet.user_id,
            video: beatmapSet.video,
            artist_unicode: beatmapSet.artist_unicode,
            covers: beatmapSet.covers,
            has_favourited: beatmapSet.has_favourited,
            hype: beatmapSet.hype as any,
            availability: beatmapSet.availability,
            bpm: beatmapSet.bpm,
            can_be_hyped: beatmapSet.can_be_hyped,
            discussion_enabled: beatmapSet.discussion_enabled,
            discussion_locked: beatmapSet.discussion_locked,
            is_scoreable: beatmapSet.is_scoreable,
            last_updated: beatmapSet.last_updated,
            nominations_summary: beatmapSet.nominations_summary,
            nsfw: beatmapSet.nsfw,
            offset: beatmapSet.offset,
            spotlight: beatmapSet.spotlight,
            storyboard: beatmapSet.storyboard,
            tags: beatmapSet.tags,
            title_unicode: beatmapSet.title_unicode,
            ranked: beatmapSet.ranked,
            ranked_date: beatmapSet.ranked_date,
            beatmaps: beatmapSet.beatmaps.map((beatmap) =>
                this.convertBeatmap(beatmap),
            ),
        };
    }
}
