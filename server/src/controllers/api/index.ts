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

                if (!beatmap.data || !full) return beatmap;

                const beatmapset = await BeatmapsManagerInstance.getBeatmapSet({
                    beatmapSetId: beatmap.data?.beatmapset_id,
                });

                return beatmapset.data ? beatmapset.data : beatmapset;
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

                if (!beatmap.data || !full) return beatmap;

                const beatmapset = await BeatmapsManagerInstance.getBeatmapSet({
                    beatmapSetId: beatmap.data?.beatmapset_id,
                });

                return beatmapset.data ? beatmapset.data : beatmapset;
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
            async ({ BeatmapsManagerInstance, params: { id } }) => {
                const data = await BeatmapsManagerInstance.getBeatmapSet({
                    beatmapSetId: Number(id),
                });

                if (!data.data) return data;

                return data.data;
            },
            {
                params: t.Object({
                    id: t.Numeric(),
                }),
                tags: ['v2'],
            },
        );

    return app;
};
