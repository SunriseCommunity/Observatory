import { HttpStatusCode } from "axios";
import type { Elysia } from "elysia";

import config, { observatoryConfigPublic } from "../config";
import { BeatmapsManagerPlugin } from "../plugins/beatmapManager";
import { StatsServicePlugin } from "../plugins/statsService";

export default (app: Elysia<any>) => {
  app.get("/", ({ redirect }) => {
    return redirect("/docs");
  });

  app.use(StatsServicePlugin)
    .use(BeatmapsManagerPlugin)
    .get("/stats", {
      detail: { tags: ["Statistics"] },
    }, async ({ StatsServiceInstance, BeatmapsManagerInstance }) => {
      const serverStats = StatsServiceInstance.getServerStatistics();
      const managerStats
        = await BeatmapsManagerInstance.getManagerStats(config.ShowInternalValuesInPublicStatsEndpoint);
      const serverConfig = observatoryConfigPublic;

      return {
        status: HttpStatusCode.Ok,
        data: {

          config: config.ShowInternalValuesInPublicStatsEndpoint ? serverConfig : undefined,
          server: serverStats,
          manager: managerStats,
        },
      };
    });

  return app;
};
