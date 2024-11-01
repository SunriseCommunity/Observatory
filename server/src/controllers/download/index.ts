import { t } from 'elysia';
import { App } from '../../app';
import { mirrorManager } from '../../plugins/mirrorManager';
import { BeatmapService } from '../../services/beatmap.service';

export default (app: App) => {
    app.use(mirrorManager)
        .decorate(({ mirrorManagerInstance }) => ({
            beatmapService: new BeatmapService(mirrorManagerInstance),
        }))
        .get(
            '/:id',
            ({ beatmapService, params: { id }, query }) =>
                beatmapService.downloadBeatmapSet({
                    beatmapSetId: Number(id),
                    noVideo: query.noVideo,
                }),
            {
                query: t.Object({
                    noVideo: t.Optional(t.Boolean()),
                }),
            },
        );

    return app;
};
