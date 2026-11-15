import type { HttpStatusCode } from "axios";

import type { GameModeInt } from "./gameMode";
import type { RankStatusInt } from "./rankStatus";

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
  beatmapFilename?: string;
  allowMissingNonBeatmapValues?: boolean;
};

export type ResultWithStatus<T> = {
  result: T | null;
  status: HttpStatusCode;
};
