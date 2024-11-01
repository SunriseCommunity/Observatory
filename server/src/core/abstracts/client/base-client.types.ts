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
    GetBeatmapSet = 1 << 0, // 1
    GetBeatmapSetByBeatmapHash = 1 << 1, // 2
    GetBeatmapSetByBeatmapId = 1 << 2, // 4
    GetBeatmap = 1 << 3, // 8
    GetBeatmapBySetId = 1 << 4, // 16
    GetBeatmapByHash = 1 << 5, // 32
    DownloadBeatmapSet = 1 << 6, // 64
    DownloadBeatmapSetNoVideo = 1 << 7, // 128 // TODO: Investigate if this is needed
}
