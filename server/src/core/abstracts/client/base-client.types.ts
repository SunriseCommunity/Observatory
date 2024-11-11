import { HttpStatusCode } from 'axios';
import { BaseClient } from './base-client.abstract';
import { RankStatusInt } from '../../../types/general/rankStatus';
import { GameModeInt } from '../../../types/general/gameMode';

export type ClientOptions = {
    baseUrl: string;
    abilities: ClientAbilities[];
};

export type SearchBeatmapsets = {
    query?: string;
    limit?: number;
    offset?: number;
    status?: RankStatusInt;
    mode?: GameModeInt;
};

export type GetBeatmapSetOptions = {
    beatmapSetId?: number;
};

export type GetBeatmapsOptions = {
    ids: number[];
};

export type DownloadBeatmapSetOptions = {
    beatmapSetId: number;
    noVideo?: boolean;
};

export type DownloadOsuBeatmap = {
    beatmapId: number;
};

export type GetBeatmapOptions = {
    beatmapId?: number;
    beatmapHash?: string;
};

export type ResultWithStatus<T> = {
    result: T | null;
    status: HttpStatusCode;
};

export enum ClientAbilities {
    GetBeatmapSetById = 1 << 0, // 1
    GetBeatmapSetByBeatmapHash = 1 << 1, // 2
    GetBeatmapSetByBeatmapId = 1 << 2, // 4
    GetBeatmapById = 1 << 3, // 8
    GetBeatmapBySetId = 1 << 4, // 16
    GetBeatmapByHash = 1 << 5, // 32
    DownloadBeatmapSetById = 1 << 6, // 64
    DownloadBeatmapSetByIdNoVideo = 1 << 7, // 128
    SearchBeatmapsets = 1 << 8, // 256
    GetBeatmaps = 1 << 9, // 512
    //GetBeatmapsets = 1 << 10, // 1024
    DownloadOsuBeatmap = 1 << 11, // 2048
}

export type MirrorClient<T extends BaseClient = BaseClient> = {
    client: T;
    weights: {
        API: number;
        download: number;
        failrate: number;
    };
};
