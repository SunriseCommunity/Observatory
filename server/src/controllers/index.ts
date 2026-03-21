import { HttpStatusCode } from "axios";

import type { App } from "../app";
import config, { observatoryConfigPublic } from "../config";
import { BeatmapsManagerPlugin } from "../plugins/beatmapManager";
import { StatsServicePlugin } from "../plugins/statsService";

export default (app: App) => {
  app.get("/", ({ redirect }) => {
    return redirect("/docs");
  });

  app.use(StatsServicePlugin)
    .use(BeatmapsManagerPlugin)
    .get(
      "/stats",
      async ({ StatsServiceInstance, BeatmapsManagerInstance }) => {
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
      },
      {
        tags: ["Statistics"],
      },
    );

  return app;
};
