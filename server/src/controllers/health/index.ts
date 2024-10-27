import { App } from "../../app";
import { HealthService } from "../../services/health.service";

export default (app: App) => {
  app
    .decorate(() => ({
      healthService: new HealthService(),
    }))
    .get("/", ({ healthService }) => healthService.get());

  return app;
};
