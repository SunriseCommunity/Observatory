import type { App } from '../app';
import { StatsServicePlugin } from '../plugins/statsService';
import { HttpStatusCode } from 'axios';
import { BeatmapsManagerPlugin } from '../plugins/beatmapManager';

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

                return {
                    status: HttpStatusCode.Ok,
                    data: {
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
