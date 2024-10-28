import { App } from "../../app";
import { BeatmapService } from "../../services/beatmap.service";

export default (app: App) => {
  app
    .decorate(() => ({
      beatmapService: new BeatmapService(),
    }))
    .get("/:id", ({ beatmapService, params: { id } }) =>
      beatmapService.get(Number(id))
    );

  return app;
};
