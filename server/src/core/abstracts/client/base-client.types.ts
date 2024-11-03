import { HttpStatusCode } from 'axios';
import { BaseClient } from './base-client.abstract';

export type ClientOptions = {
    baseUrl: string;
    abilities: ClientAbilities[];
};

export type GetBeatmapSetOptions = {
    beatmapSetId?: number;
    beatmapId?: number;
    beatmapHash?: string;
};

export type DownloadBeatmapSetOptions = {
    beatmapSetId: number;
    noVideo?: boolean;
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
    DownloadBeatmapSetByIdNoVideo = 1 << 7, // 128 // TODO: Investigate if this is needed

    // FIXME: Enum is strange in TS, find a better way to represent this
    // // Combinations for rate limiting routes
    // GetBeatmap = GetBeatmapById | GetBeatmapByHash | GetBeatmapBySetId,
    // GetBeatmapSet = GetBeatmapSetById |
    //     GetBeatmapSetByBeatmapHash |
    //     GetBeatmapSetByBeatmapId,
    // DownloadBeatmapSet = DownloadBeatmapSetById | DownloadBeatmapSetByIdNoVideo,

    // API = GetBeatmap | GetBeatmapSet,
    // Download = DownloadBeatmapSet,
}

export type MirrorClient<T extends BaseClient = BaseClient> = {
    client: T;
    weights: {
        API: number;
        download: number;
        failrate: number;
    };
};
