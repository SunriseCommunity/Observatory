import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin).get(
        '/:id',
        ({ BeatmapsManagerInstance, params: { id }, set }) =>
            BeatmapsManagerInstance.downloadOsuBeatmap({
                beatmapId: id,
            }).then((res) => {
                if (res.source) {
                    set.headers['X-Data-Source'] = res.source;
                }

                res.source = undefined;

                return res?.data ?? res;
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
