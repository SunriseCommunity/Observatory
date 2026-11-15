import { beatmapsService } from "@observatory/beatmaps";
import config, { observatoryConfigPublic } from "@observatory/common/config";
import { HttpStatusCode } from "axios";
import { Elysia } from "elysia";

import { statsService } from ".";

export const statsController = new Elysia()
  .get("/stats", {
    detail: { tags: ["Statistics"] },
  }, async () => {
    const serverStats = statsService.getServerStatistics();
    const managerStats
      = await beatmapsService.getManagerStats(config.ShowInternalValuesInPublicStatsEndpoint);
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
