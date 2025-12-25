import type { HttpStatusCode } from "axios";

import type { GameModeInt } from "../../../types/general/gameMode";
import type { RankStatusInt } from "../../../types/general/rankStatus";
import type { BaseClient } from "./base-client.abstract";

export type ClientOptions = {
  baseUrl: string;
  abilities: ClientAbilities[];
};

export type SearchBeatmapsetsOptions = {
  query?: string;
  limit?: number;
  offset?: number;
  status?: RankStatusInt[];
  mode?: GameModeInt;
};

export type GetBeatmapSetOptions = {
  beatmapSetId?: number;
};

export type GetBeatmapsOptions = {
  ids: number[];
};

export type GetBeatmapsetsByBeatmapIdsOptions = {
  beatmapIds: number[];
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
  allowMissingNonBeatmapValues?: boolean;
};

export type ResultWithStatus<T> = {
  result: T | null;
  status: HttpStatusCode;
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
}

export type MirrorClient<T extends BaseClient = BaseClient> = {
  client: T;
  weights: {
    API: number;
    download: number;
    failrate: number;
  };
};
