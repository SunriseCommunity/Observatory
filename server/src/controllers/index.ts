import type { App } from "../app";
import { sessionUser } from "../plugins/sessionUser";
import { IndexService } from "../services/index.service";

export default (app: App) => {
  app
    .use(sessionUser)
    .decorate(() => ({
      indexService: new IndexService(),
    }))
    .get("/", ({ indexService, user }) => indexService.get(user.ip));

  return app;
};
