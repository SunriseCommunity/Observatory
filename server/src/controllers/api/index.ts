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
                set,
            }) => {
                const beatmap = await BeatmapsManagerInstance.getBeatmap({
                    beatmapId: id,
                });

                if (beatmap.source) {
                    set.headers['X-Data-Source'] = beatmap.source;
                }

                beatmap.source = undefined;

                if (!beatmap.data) return beatmap;

                if (!full) return beatmap.data;

                const beatmapset = await BeatmapsManagerInstance.getBeatmapSet({
                    beatmapSetId: beatmap.data?.beatmapset_id,
                });

                if (beatmapset.source) {
                    set.headers['X-Data-Source'] = beatmapset.source;
                }

                beatmapset.source = undefined;

                if (beatmapset.data)
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
                set,
            }) => {
                const beatmap = await BeatmapsManagerInstance.getBeatmap({
                    beatmapHash: hash,
                });

                if (beatmap.source) {
                    set.headers['X-Data-Source'] = beatmap.source;
                }

                beatmap.source = undefined;

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
                    full: t.Optional(t.BooleanString()),
                }),
                tags: ['v2'],
            },
        )
        .get(
            'v2/s/:id',
            async ({ BeatmapsManagerInstance, params: { id }, set }) => {
                const data = await BeatmapsManagerInstance.getBeatmapSet({
                    beatmapSetId: id,
                });

                if (data.source) {
                    set.headers['X-Data-Source'] = data.source;
                }

                data.source = undefined;

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
            async ({ BeatmapsManagerInstance, query, set }) => {
                // TODO: Add another search endpoint which would parse cursors instead of pages, to create compatibility with bancho api;

                const data = await BeatmapsManagerInstance.searchBeatmapsets({
                    ...query,
                });

                if (data.source) {
                    set.headers['X-Data-Source'] = data.source;
                }

                data.source = undefined;

                if (!data.data) return data;

                return data.data;
            },
            {
                query: t.Object({
                    query: t.Optional(t.String()),
                    limit: t.Optional(t.Numeric()),
                    offset: t.Optional(t.Numeric()),
                    status: t.Optional(t.Array(t.Numeric())),
                    mode: t.Optional(t.Numeric()),
                }),
                tags: ['v2'],
            },
        )
        .get(
            'v2/beatmaps',
            async ({ BeatmapsManagerInstance, query, set }) => {
                const data = await BeatmapsManagerInstance.getBeatmaps({
                    ids: query.ids,
                });

                if (data.source) {
                    set.headers['X-Data-Source'] = data.source;
                }

                data.source = undefined;

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
