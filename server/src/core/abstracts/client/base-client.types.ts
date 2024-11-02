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

export type ResultWithPrice<T> = {
    result: T;
    price: number;
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

    // Combinations for rate limiting routes
    GetBeatmap = GetBeatmapById | GetBeatmapByHash | GetBeatmapBySetId,
    GetBeatmapSet = GetBeatmapSetById |
        GetBeatmapSetByBeatmapHash |
        GetBeatmapSetByBeatmapId,
    DownloadBeatmapSet = DownloadBeatmapSetById | DownloadBeatmapSetByIdNoVideo,
}

export type MirrorClient<T extends BaseClient = BaseClient> = {
    client: T;
    weight: number;
    requests: {
        processed: number;
        failed: number;
        total: number;
    };
};
