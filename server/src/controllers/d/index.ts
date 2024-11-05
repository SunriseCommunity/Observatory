import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin).get(
        '/:id',
        ({ BeatmapsManagerInstance, params: { id }, query }) =>
            BeatmapsManagerInstance.downloadBeatmapSet({
                beatmapSetId: Number(id),
                noVideo: query.noVideo,
            }),
        {
            query: t.Object({
                noVideo: t.Optional(t.Boolean()),
            }),
            tags: ['Files'],
        },
    );

    return app;
};
