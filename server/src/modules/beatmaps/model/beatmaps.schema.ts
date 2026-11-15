import { BEATMAPS_SEARCH_MAX_RESULTS_LIMIT } from "@observatory/common/types/api";
import type { UnwrapModels } from "elysia";
import { t } from "elysia";

// Only request schemas live here: responses are proxied from mirrors, so their shape is not ours to enforce.

export const V2BByIdGet = {
  Params: t.Object({
    id: t.Numeric(),
  }),
  Query: t.Object({
    full: t.Optional(t.Boolean()),
    allowMissingNonBeatmapValues: t.Optional(t.Boolean()), // TODO: Ideally, we should have shortBeatmap endpoint which would return only beatmap values.
  }),
};
export type V2BByIdGet = UnwrapModels<typeof V2BByIdGet>;

export const V2FilenameByFilenameGet = {
  Params: t.Object({
    filename: t.String(),
  }),
  Query: t.Object({
    full: t.Optional(t.BooleanString()),
  }),
};
export type V2FilenameByFilenameGet = UnwrapModels<typeof V2FilenameByFilenameGet>;

export const V2Md5ByHashGet = {
  Params: t.Object({
    hash: t.String(),
  }),
  Query: t.Object({
    full: t.Optional(t.BooleanString()),
    allowMissingNonBeatmapValues: t.Optional(t.Boolean()), // TODO: Ideally, we should have shortBeatmap endpoint which would return only beatmap values.
  }),
};
export type V2Md5ByHashGet = UnwrapModels<typeof V2Md5ByHashGet>;

export const V2SByIdGet = {
  Params: t.Object({
    id: t.Numeric(),
  }),
};
export type V2SByIdGet = UnwrapModels<typeof V2SByIdGet>;

export const V2SearchGet = {
  Query: t.Object({
    query: t.Optional(t.String()),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: BEATMAPS_SEARCH_MAX_RESULTS_LIMIT })),
    offset: t.Optional(t.Numeric()),
    status: t.Optional(t.Array(t.Numeric())),
    mode: t.Optional(t.Numeric()),
  }),
};
export type V2SearchGet = UnwrapModels<typeof V2SearchGet>;

export const V2BeatmapsGet = {
  Query: t.Object({
    ids: t.Array(t.Numeric()),
  }),
};
export type V2BeatmapsGet = UnwrapModels<typeof V2BeatmapsGet>;

export const V2BeatmapsetsGet = {
  Query: t.Object({
    beatmapIds: t.Array(t.Numeric()),
  }),
};
export type V2BeatmapsetsGet = UnwrapModels<typeof V2BeatmapsetsGet>;

export const DownloadByIdGet = {
  Params: t.Object({
    id: t.Numeric(),
  }),
  Query: t.Object({
    noVideo: t.Optional(t.BooleanString()),
  }),
};
export type DownloadByIdGet = UnwrapModels<typeof DownloadByIdGet>;

export const OsuByIdGet = {
  Params: t.Object({
    id: t.Numeric(),
  }),
};
export type OsuByIdGet = UnwrapModels<typeof OsuByIdGet>;
