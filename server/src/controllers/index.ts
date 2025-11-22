import type { App } from '../app';
import { StatsServicePlugin } from '../plugins/statsService';
import { HttpStatusCode } from 'axios';
import { BeatmapsManagerPlugin } from '../plugins/beatmapManager';
import { observationaryConfigPublic } from '../config';

export default (app: App) => {
    app.get('/', ({ redirect }) => {
        return redirect('/docs');
    });

    app.use(StatsServicePlugin)
        .use(BeatmapsManagerPlugin)
        .get(
            '/stats',
            async ({ StatsServiceInstance, BeatmapsManagerInstance }) => {
                const serverStats = StatsServiceInstance.getServerStatistics();
                const managerStats =
                    await BeatmapsManagerInstance.getManagerStats();
                const serverConfig = observationaryConfigPublic;

                return {
                    status: HttpStatusCode.Ok,
                    data: {
                        config: serverConfig,
                        server: serverStats,
                        manager: managerStats,
                    },
                };
            },
            {
                tags: ['Statistics'],
            },
        );

    return app;
};
