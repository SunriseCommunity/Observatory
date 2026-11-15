import serverTiming from "@elysia/server-timing";

import config from "../config";

export const serverTimingPlugin = serverTiming({ enabled: !config.IsProduction });
