import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin).get(
        '/:id',
        ({ BeatmapsManagerInstance, params: { id } }) =>
            BeatmapsManagerInstance.downloadOsuBeatmap({
                beatmapId: id,
            }),
        {
            params: t.Object({
                id: t.Number(),
            }),
            tags: ['Files'],
        },
    );

    return app;
};
