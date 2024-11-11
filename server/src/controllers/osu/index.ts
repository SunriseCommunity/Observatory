import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin).get(
        '/:id',
        ({ BeatmapsManagerInstance, params: { id } }) =>
            BeatmapsManagerInstance.downloadOsuBeatmap({
                beatmapId: Number(id),
            }),
        {
            tags: ['Files'],
        },
    );

    return app;
};
