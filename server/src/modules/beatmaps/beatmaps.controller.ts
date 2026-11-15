import { BEATMAPS_SEARCH_MAX_RESULTS_LIMIT } from "@observatory/common/types/api";
import type { GetBeatmapOptions } from "@observatory/common/types/beatmap-query";
import type { Context } from "elysia";
import { Elysia, t } from "elysia";

import { beatmapsService } from ".";
import { unwrapServerResponse } from "./helper/server-response.helper";

async function getBeatmapResponse(options: GetBeatmapOptions, full: boolean | undefined, set: Context["set"]) {
  const beatmap = await beatmapsService.getBeatmap(options);
  const response = unwrapServerResponse(beatmap, set);

  if (!full || !beatmap.data)
    return response;

  const beatmapset = await beatmapsService.getBeatmapSet({
    beatmapSetId: beatmap.data.beatmapset_id,
  });

  return unwrapServerResponse(beatmapset, set);
}

export const beatmapsController = new Elysia({ prefix: "/api" })
  .get("v2/b/:id", {
    params: t.Object({
      id: t.Numeric(),
    }),
    query: t.Object({
      full: t.Optional(t.Boolean()),
      allowMissingNonBeatmapValues: t.Optional(t.Boolean()), // TODO: Ideally, we should have shortBeatmap endpoint which would return only beatmap values.
    }),
    detail: { tags: ["v2"] },
  }, ({ params: { id }, query: { full, allowMissingNonBeatmapValues }, set }) =>
    getBeatmapResponse({
      beatmapId: id,
      allowMissingNonBeatmapValues: full || allowMissingNonBeatmapValues,
    }, full, set))
  .get("v2/filename/:filename", {
    params: t.Object({
      filename: t.String(),
    }),
    query: t.Object({
      full: t.Optional(t.BooleanString()),
    }),
    detail: { tags: ["v2"] },
  }, ({ params: { filename }, query: { full }, set }) =>
    getBeatmapResponse({
      beatmapFilename: filename,
      allowMissingNonBeatmapValues: full,
    }, full, set))
  .get("v2/md5/:hash", {
    params: t.Object({
      hash: t.String(),
    }),
    query: t.Object({
      full: t.Optional(t.BooleanString()),
      allowMissingNonBeatmapValues: t.Optional(t.Boolean()), // TODO: Ideally, we should have shortBeatmap endpoint which would return only beatmap values.
    }),
    detail: { tags: ["v2"] },
  }, ({ params: { hash }, query: { full, allowMissingNonBeatmapValues }, set }) =>
    getBeatmapResponse({
      beatmapHash: hash,
      allowMissingNonBeatmapValues: full || allowMissingNonBeatmapValues,
    }, full, set))
  .get("v2/s/:id", {
    params: t.Object({
      id: t.Numeric(),
    }),
    detail: { tags: ["v2"] },
  }, async ({ params: { id }, set }) =>
    unwrapServerResponse(await beatmapsService.getBeatmapSet({ beatmapSetId: id }), set))
  .get("v2/search", {
    query: t.Object({
      query: t.Optional(t.String()),
      limit: t.Optional(t.Numeric({ min: 1, max: BEATMAPS_SEARCH_MAX_RESULTS_LIMIT })),
      offset: t.Optional(t.Numeric()),
      status: t.Optional(t.Array(t.Numeric())),
      mode: t.Optional(t.Numeric()),
    }),
    detail: { tags: ["v2"] },
  }, async ({ query, set }) => {
    // TODO: Add another search endpoint which would parse cursors instead of pages, to create compatibility with bancho api;

    if (query.limit && (query.limit > BEATMAPS_SEARCH_MAX_RESULTS_LIMIT || query.limit < 1)) {
      throw new Error(`Limit is too high. Maximum limit is ${BEATMAPS_SEARCH_MAX_RESULTS_LIMIT}`);
    }

    const data = await beatmapsService.searchBeatmapsets({
      limit: query.limit ?? 50,
      ...query,
    });

    return unwrapServerResponse(data, set);
  })
  .get("v2/beatmaps", {
    query: t.Object({
      ids: t.Array(t.Numeric()),
    }),
    detail: { tags: ["v2"] },
  }, async ({ query, set }) =>
    unwrapServerResponse(await beatmapsService.getBeatmaps({ ids: query.ids }), set))
  .get("v2/beatmapsets", {
    query: t.Object({
      beatmapIds: t.Array(t.Numeric()),
    }),
    detail: { tags: ["v2"] },
  }, async ({ query, set }) =>
    unwrapServerResponse(await beatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: query.beatmapIds }), set));

export const downloadController = new Elysia({ prefix: "/d" })
  .get("/:id", {
    params: t.Object({
      id: t.Numeric(),
    }),
    query: t.Object({
      noVideo: t.Optional(t.BooleanString()),
    }),
    detail: { tags: ["Files"] },
  }, async ({ params: { id }, query, set }) =>
    unwrapServerResponse(await beatmapsService.downloadBeatmapSet({
      beatmapSetId: id,
      noVideo: query.noVideo,
    }), set));

export const osuController = new Elysia({ prefix: "/osu" })
  .get("/:id", {
    params: t.Object({
      id: t.Numeric(),
    }),
    detail: { tags: ["Files"] },
  }, async ({ params: { id }, set }) =>
    unwrapServerResponse(await beatmapsService.downloadOsuBeatmap({ beatmapId: id }), set));
