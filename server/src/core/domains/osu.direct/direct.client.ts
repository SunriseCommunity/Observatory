import { BaseClient } from '../../abstracts/client/base-client.abstract';
import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    ResultWithPrice,
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
    ): Promise<ResultWithPrice<Beatmapset | null>> {
        if (ctx.beatmapSetId) {
            return {
                result: await this._getBeatmapSet(ctx.beatmapSetId),
                price: 1,
            };
        } else if (ctx.beatmapId) {
            const beatmap = await this._getBeatmapById(ctx.beatmapId);

            if (!beatmap) {
                return { result: null, price: 1 };
            }

            return {
                result: await this._getBeatmapSet(beatmap.beatmapset_id),
                price: 2,
            };
        } else if (ctx.beatmapHash) {
            const beatmap = await this._getBeatmapByHash(ctx.beatmapHash);

            if (!beatmap) {
                return { result: null, price: 1 };
            }

            return {
                result: await this._getBeatmapSet(beatmap.beatmapset_id),
                price: 2,
            };
        }

        throw new Error('Invalid arguments');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithPrice<Beatmap | null>> {
        if (ctx.beatmapId) {
            return {
                result: await this._getBeatmapById(ctx.beatmapId),
                price: 1,
            };
        } else if (ctx.beatmapHash) {
            return {
                result: await this._getBeatmapByHash(ctx.beatmapHash),
                price: 1,
            };
        }

        throw new Error('Invalid arguments');
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithPrice<ArrayBuffer | null>> {
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
            return { result: null, price: 1 };
        }

        return { result: result.data, price: 1 };
    }

    private async _getBeatmapSet(
        beatmapSetId: number,
    ): Promise<Beatmapset | null> {
        const result = await this.api.get<DirectBeatmapSet>(
            `v2/s/${beatmapSetId}`,
        );

        if (!result || result.status !== 200) {
            return null;
        }

        return this._convertBeatmapSet(result.data);
    }

    private async _getBeatmapById(beatmapId: number): Promise<Beatmap | null> {
        const result = await this.api.get<DirectBeatmap>(`v2/b/${beatmapId}`);

        if (!result || result.status !== 200) {
            return null;
        }

        return this._convertBeatmap(result.data);
    }

    private async _getBeatmapByHash(
        beatmapHash: string,
    ): Promise<Beatmap | null> {
        const result = await this.api.get<DirectBeatmap>(
            `v2/md5/${beatmapHash}`,
        );

        if (!result || result.status !== 200) {
            return null;
        }

        return this._convertBeatmap(result.data);
    }

    private _convertBeatmap(beatmap: DirectBeatmap): Beatmap {
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

    private async _convertBeatmapSet(
        beatmapSet: DirectBeatmapSet,
    ): Promise<Beatmapset> {
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
                this._convertBeatmap(beatmap),
            ),
        };
    }
}
