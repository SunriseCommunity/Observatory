import Elysia from "elysia";

import { StatsService } from "../core/services/stats.service";

export const StatsServiceInstance = new StatsService();

export const StatsServicePlugin = new Elysia({
  name: "StatsService",
}).decorate(() => ({
  StatsServiceInstance,
}));
