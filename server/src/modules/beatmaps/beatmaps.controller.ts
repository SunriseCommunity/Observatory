import type { GetBeatmapOptions } from "@observatory/common/types/beatmap-query";
import { Elysia } from "elysia";

import { unwrapServerResponse } from "./helper/server-response.helper";
import * as BeatmapsModel from "./model/beatmaps.schema";
import { BeatmapsService } from "./service/beatmaps.service";

async function getBeatmapResponse(options: GetBeatmapOptions, full: boolean | undefined, headers: Record<string, string | number | string[]>) {
  const beatmap = await BeatmapsService.getBeatmap(options);
  const response = unwrapServerResponse(beatmap, headers);

  if (!full || !beatmap.data)
    return response;

  const beatmapset = await BeatmapsService.getBeatmapSet({
    beatmapSetId: beatmap.data.beatmapset_id,
  });

  return unwrapServerResponse(beatmapset, headers);
}

export const beatmapsController = new Elysia({ prefix: "/api" })
  .get("v2/b/:id", {
    params: BeatmapsModel.V2BByIdGet.Params,
    query: BeatmapsModel.V2BByIdGet.Query,
    detail: { tags: ["v2"] },
  }, ({ params: { id }, query: { full, allowMissingNonBeatmapValues }, set }) =>
    getBeatmapResponse({
      beatmapId: id,
      allowMissingNonBeatmapValues: full || allowMissingNonBeatmapValues,
    }, full, set.headers))
  .get("v2/filename/:filename", {
    params: BeatmapsModel.V2FilenameByFilenameGet.Params,
    query: BeatmapsModel.V2FilenameByFilenameGet.Query,
    detail: { tags: ["v2"] },
  }, ({ params: { filename }, query: { full }, set }) =>
    getBeatmapResponse({
      beatmapFilename: filename,
      allowMissingNonBeatmapValues: full,
    }, full, set.headers))
  .get("v2/md5/:hash", {
    params: BeatmapsModel.V2Md5ByHashGet.Params,
    query: BeatmapsModel.V2Md5ByHashGet.Query,
    detail: { tags: ["v2"] },
  }, ({ params: { hash }, query: { full, allowMissingNonBeatmapValues }, set }) =>
    getBeatmapResponse({
      beatmapHash: hash,
      allowMissingNonBeatmapValues: full || allowMissingNonBeatmapValues,
    }, full, set.headers))
  .get("v2/s/:id", {
    params: BeatmapsModel.V2SByIdGet.Params,
    detail: { tags: ["v2"] },
  }, async ({ params: { id }, set }) =>
    unwrapServerResponse(await BeatmapsService.getBeatmapSet({ beatmapSetId: id }), set.headers))
  .get("v2/search", {
    query: BeatmapsModel.V2SearchGet.Query,
    detail: { tags: ["v2"] },
  }, async ({ query, set }) => {
    // TODO: Add another search endpoint which would parse cursors instead of pages, to create compatibility with bancho api;

    const data = await BeatmapsService.searchBeatmapsets({
      limit: query.limit ?? 50,
      ...query,
    });

    return unwrapServerResponse(data, set.headers);
  })
  .get("v2/beatmaps", {
    query: BeatmapsModel.V2BeatmapsGet.Query,
    detail: { tags: ["v2"] },
  }, async ({ query, set }) =>
    unwrapServerResponse(await BeatmapsService.getBeatmaps({ ids: query.ids }), set.headers))
  .get("v2/beatmapsets", {
    query: BeatmapsModel.V2BeatmapsetsGet.Query,
    detail: { tags: ["v2"] },
  }, async ({ query, set }) =>
    unwrapServerResponse(await BeatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: query.beatmapIds }), set.headers));

export const downloadController = new Elysia({ prefix: "/d" })
  .get("/:id", {
    params: BeatmapsModel.DownloadByIdGet.Params,
    query: BeatmapsModel.DownloadByIdGet.Query,
    detail: { tags: ["Files"] },
  }, async ({ params: { id }, query, set }) =>
    unwrapServerResponse(await BeatmapsService.downloadBeatmapSet({
      beatmapSetId: id,
      noVideo: query.noVideo,
    }), set.headers));

export const osuController = new Elysia({ prefix: "/osu" })
  .get("/:id", {
    params: BeatmapsModel.OsuByIdGet.Params,
    detail: { tags: ["Files"] },
  }, async ({ params: { id }, set }) =>
    unwrapServerResponse(await BeatmapsService.downloadOsuBeatmap({ beatmapId: id }), set.headers));
