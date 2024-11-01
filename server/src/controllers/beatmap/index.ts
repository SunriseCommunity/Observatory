import { App } from '../../app';
import { mirrorManager } from '../../plugins/mirrorManager';
import { BeatmapService } from '../../services/beatmap.service';

export default (app: App) => {
    app.use(mirrorManager)
        .decorate(({ mirrorManagerInstance }) => ({
            beatmapService: new BeatmapService(mirrorManagerInstance),
        }))
        .get('/:id', ({ beatmapService, params: { id } }) =>
            beatmapService.getBeatmap({ beatmapId: Number(id) }),
        );

    return app;
};
