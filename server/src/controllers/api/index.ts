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
                    beatmapId: id,
                });

                if (!beatmap.data) return beatmap;

                if (!full) return beatmap.data;

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

                if (!beatmap.data) return beatmap;

                if (!full) return beatmap.data;

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
                    beatmapSetId: id,
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
        )
        .get(
            'v2/search',
            async ({ BeatmapsManagerInstance, query }) => {
                const data = await BeatmapsManagerInstance.searchBeatmapsets({
                    ...query,
                });

                if (!data.data) return data;

                return data.data;
            },
            {
                query: t.Object({
                    query: t.Optional(t.String()),
                    limit: t.Optional(t.Numeric()),
                    offset: t.Optional(t.Numeric()),
                    status: t.Optional(t.Numeric()),
                    mode: t.Optional(t.Numeric()),
                }),
                tags: ['v2'],
            },
        )
        .get(
            'v2/beatmaps',
            async ({ BeatmapsManagerInstance, query }) => {
                const data = await BeatmapsManagerInstance.getBeatmaps({
                    ids: query.ids,
                });

                if (!data.data) return data;

                return data.data;
            },
            {
                query: t.Object({
                    ids: t.Array(t.Numeric()),
                }),
                tags: ['v2'],
            },
        );

    return app;
};
