import { t } from "elysia";

import type { App } from "../../app";
import { BeatmapsManagerPlugin } from "../../plugins/beatmapManager";

export default (app: App) => {
  app.use(BeatmapsManagerPlugin)
    .get(
      "v2/b/:id",
      async ({
        BeatmapsManagerInstance,
        params: { id },
        query: { full, allowMissingNonBeatmapValues },
        set,
      }) => {
        const beatmap = await BeatmapsManagerInstance.getBeatmap({
          beatmapId: id,
          allowMissingNonBeatmapValues:
                        full || allowMissingNonBeatmapValues,
        });

        if (beatmap.source) {
          set.headers["X-Data-Source"] = beatmap.source;
        }

        const { source: _, ...responseBeatmap } = beatmap;

        if (!full)
          return responseBeatmap?.data ?? responseBeatmap;

        const beatmapset = await BeatmapsManagerInstance.getBeatmapSet({
          beatmapSetId: responseBeatmap.data?.beatmapset_id,
        });

        if (beatmapset.source) {
          set.headers["X-Data-Source"] = beatmapset.source;
        }

        const { source: __, ...responseBeatmapset } = beatmapset;

        return responseBeatmapset?.data ?? responseBeatmapset;
      },
      {
        params: t.Object({
          id: t.Numeric(),
        }),
        query: t.Object({
          full: t.Optional(t.Boolean()),
          allowMissingNonBeatmapValues: t.Optional(t.Boolean()), // TODO: Ideally, we should have shortBeatmap endpoint which would return only beatmap values.
        }),
        tags: ["v2"],
      },
    )
    .get(
      "v2/md5/:hash",
      async ({
        BeatmapsManagerInstance,
        params: { hash },
        query: { full, allowMissingNonBeatmapValues },
        set,
      }) => {
        const beatmap = await BeatmapsManagerInstance.getBeatmap({
          beatmapHash: hash,
          allowMissingNonBeatmapValues:
                        full || allowMissingNonBeatmapValues,
        });

        if (beatmap.source) {
          set.headers["X-Data-Source"] = beatmap.source;
        }

        const { source: _, ...responseBeatmap } = beatmap;
        if (!full)
          return responseBeatmap?.data ?? responseBeatmap;

        const beatmapset = await BeatmapsManagerInstance.getBeatmapSet({
          beatmapSetId: beatmap.data?.beatmapset_id,
        });

        if (beatmapset.source) {
          set.headers["X-Data-Source"] = beatmapset.source;
        }

        const { source: __, ...responseBeatmapset } = beatmapset;
        return responseBeatmapset?.data ?? responseBeatmapset;
      },
      {
        params: t.Object({
          hash: t.String(),
        }),
        query: t.Object({
          full: t.Optional(t.BooleanString()),
          allowMissingNonBeatmapValues: t.Optional(t.Boolean()), // TODO: Ideally, we should have shortBeatmap endpoint which would return only beatmap values.
        }),
        tags: ["v2"],
      },
    )
    .get(
      "v2/s/:id",
      async ({ BeatmapsManagerInstance, params: { id }, set }) => {
        const data = await BeatmapsManagerInstance.getBeatmapSet({
          beatmapSetId: id,
        });

        if (data.source) {
          set.headers["X-Data-Source"] = data.source;
        }

        const { source: _, ...response } = data;
        return response?.data ?? response;
      },
      {
        params: t.Object({
          id: t.Numeric(),
        }),
        tags: ["v2"],
      },
    )
    .get(
      "v2/search",
      async ({ BeatmapsManagerInstance, query, set }) => {
        // TODO: Add another search endpoint which would parse cursors instead of pages, to create compatibility with bancho api;

        const data = await BeatmapsManagerInstance.searchBeatmapsets({
          ...query,
        });

        if (data.source) {
          set.headers["X-Data-Source"] = data.source;
        }

        const { source: _, ...response } = data;
        return response?.data ?? response;
      },
      {
        query: t.Object({
          query: t.Optional(t.String()),
          limit: t.Optional(t.Numeric()),
          offset: t.Optional(t.Numeric()),
          status: t.Optional(t.Array(t.Numeric())),
          mode: t.Optional(t.Numeric()),
        }),
        tags: ["v2"],
      },
    )
    .get(
      "v2/beatmaps",
      async ({ BeatmapsManagerInstance, query, set }) => {
        const data = await BeatmapsManagerInstance.getBeatmaps({
          ids: query.ids,
        });

        if (data.source) {
          set.headers["X-Data-Source"] = data.source;
        }

        const { source: _, ...response } = data;
        return response?.data ?? response;
      },
      {
        query: t.Object({
          ids: t.Array(t.Numeric()),
        }),
        tags: ["v2"],
      },
    )
    .get(
      "v2/beatmapsets",
      async ({ BeatmapsManagerInstance, query, set }) => {
        const data
          = await BeatmapsManagerInstance.getBeatmapsetsByBeatmapIds({
            beatmapIds: query.beatmapIds,
          });

        if (data.source) {
          set.headers["X-Data-Source"] = data.source;
        }

        const { source: _, ...response } = data;
        return response?.data ?? response;
      },
      {
        query: t.Object({
          beatmapIds: t.Array(t.Numeric()),
        }),
        tags: ["v2"],
      },
    );

  return app;
};
