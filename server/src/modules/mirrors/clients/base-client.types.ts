import type { BaseClient } from "./base-client.abstract";

export type ClientOptions = {
  baseUrl: string;
  abilities: ClientAbilities[];
};

export enum ClientAbilities {
  GetBeatmapSetById = 1 << 0, // 1
  GetBeatmapById = 1 << 3, // 8
  GetBeatmapByHash = 1 << 5, // 32
  DownloadBeatmapSetById = 1 << 6, // 64
  DownloadBeatmapSetByIdNoVideo = 1 << 7, // 128
  SearchBeatmapsets = 1 << 8, // 256
  GetBeatmaps = 1 << 9, // 512
  DownloadOsuBeatmap = 1 << 10, // 1024
  GetBeatmapsetsByBeatmapIds = 1 << 11, // 2048
  GetBeatmapByIdWithSomeNonBeatmapValues = 1 << 12, // 4096
  GetBeatmapByHashWithSomeNonBeatmapValues = 1 << 13, // 8192
  GetBeatmapByFilename = 1 << 14, // 16384
}

export type MirrorClient<T extends BaseClient = BaseClient> = {
  client: T;
  weights: {
    API: number;
    download: number;
    failrate: number;
  };
};
