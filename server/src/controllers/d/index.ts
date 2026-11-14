import type { Elysia } from "elysia";
import { t } from "elysia";

import { BeatmapsManagerPlugin } from "../../plugins/beatmapManager";

export default (app: Elysia<any>) => {
  app.use(BeatmapsManagerPlugin).get("/:id", {
    params: t.Object({
      id: t.Number(),
    }),
    query: t.Object({
      noVideo: t.Optional(t.BooleanString()),
    }),
    detail: { tags: ["Files"] },
  }, async ({ BeatmapsManagerInstance, params: { id }, query, set }) =>
    BeatmapsManagerInstance.downloadBeatmapSet({
      beatmapSetId: id,
      noVideo: query.noVideo,
    }).then((res) => {
      if (res.source) {
        set.headers["X-Data-Source"] = res.source;
      }

      const { source: _, ...response } = res;
      return response?.data ?? response;
    }));

  return app;
};
