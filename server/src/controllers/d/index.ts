import { t } from "elysia";

import type { App } from "../../app";
import { BeatmapsManagerPlugin } from "../../plugins/beatmapManager";

export default (app: App) => {
  app.use(BeatmapsManagerPlugin).get(
    "/:id",
    async ({ BeatmapsManagerInstance, params: { id }, query, set }) =>
      BeatmapsManagerInstance.downloadBeatmapSet({
        beatmapSetId: id,
        noVideo: query.noVideo,
      }).then((res) => {
        if (res.source) {
          set.headers["X-Data-Source"] = res.source;
        }

        const { source: _, ...response } = res;
        return response?.data ?? response;
      }),
    {
      params: t.Object({
        id: t.Number(),
      }),
      query: t.Object({
        noVideo: t.Optional(t.BooleanString()),
      }),
      tags: ["Files"],
    },
  );

  return app;
};
