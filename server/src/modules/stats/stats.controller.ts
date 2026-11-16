import { HttpStatusCode } from "axios";
import { Elysia } from "elysia";

import { StatsService } from "./service/stats.service";

export const statsController = new Elysia()
  .get("/stats", {
    detail: { tags: ["Statistics"] },
  }, async () => {
    return {
      status: HttpStatusCode.Ok,
      data: await StatsService.getStats(),
    };
  });
