import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin)
        .get(
            'v2/b/:id',
            ({ BeatmapsManagerInstance, params: { id } }) =>
                BeatmapsManagerInstance.getBeatmap({ beatmapId: Number(id) }),
            {
                params: t.Object({
                    id: t.Numeric(),
                }),
                tags: ['v2'],
            },
        )
        .get(
            'v2/s/:id',
            ({ BeatmapsManagerInstance, params: { id } }) =>
                BeatmapsManagerInstance.getBeatmapSet({
                    beatmapSetId: Number(id),
                }),
            {
                params: t.Object({
                    id: t.Numeric(),
                }),
                tags: ['v2'],
            },
        )
        .get(
            'v2/md5/:hash',
            ({ BeatmapsManagerInstance, params: { hash } }) =>
                BeatmapsManagerInstance.getBeatmap({ beatmapHash: hash }),
            {
                params: t.Object({
                    hash: t.String(),
                }),
                tags: ['v2'],
            },
        );

    return app;
};
