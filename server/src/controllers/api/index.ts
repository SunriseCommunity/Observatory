import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin)
        .get(
            'v2/b/:id',
            async ({
                BeatmapsManagerInstance,
                params: { id },
                query: { full },
            }) => {
                const beatmap = await BeatmapsManagerInstance.getBeatmap({
                    beatmapId: Number(id),
                });

                if (!beatmap.data) return beatmap;

                console.log(full);

                return full
                    ? BeatmapsManagerInstance.getBeatmapSet({
                          beatmapSetId: beatmap.data?.beatmapset_id,
                      })
                    : beatmap;
            },
            {
                params: t.Object({
                    id: t.Numeric(),
                }),
                query: t.Object({
                    full: t.Optional(t.Boolean()),
                }),
                tags: ['v2'],
            },
        )
        .get(
            'v2/md5/:hash',
            async ({
                BeatmapsManagerInstance,
                params: { hash },
                query: { full },
            }) => {
                const beatmap = await BeatmapsManagerInstance.getBeatmap({
                    beatmapHash: hash,
                });

                if (!beatmap.data) return beatmap;

                return full
                    ? BeatmapsManagerInstance.getBeatmapSet({
                          beatmapSetId: beatmap.data?.beatmapset_id,
                      })
                    : beatmap;
            },
            {
                params: t.Object({
                    hash: t.String(),
                }),
                query: t.Object({
                    full: t.Optional(t.Boolean()),
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
        );

    return app;
};
