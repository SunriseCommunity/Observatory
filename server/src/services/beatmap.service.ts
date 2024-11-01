import { Beatmap, Beatmapset } from '../types/beatmap';
import { MirrorManager } from '../core/managers/mirror.manager';
import {
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
} from '../core/abstracts/client/base-client.types';

export class BeatmapService {
    private readonly _mirrorManager: MirrorManager;

    constructor(mirrorManager: MirrorManager) {
        this._mirrorManager = mirrorManager;
    }

    // TODO: Add local storage for beatmaps here

    async getBeatmap(ctx: GetBeatmapOptions): Promise<Beatmap | null> {
        const beatmap = await this._mirrorManager.getBeatmap(ctx);

        if (!beatmap) {
            return null;
        }

        return beatmap;
    }

    async getBeatmapSet(ctx: GetBeatmapSetOptions): Promise<Beatmapset | null> {
        const beatmapSet = await this._mirrorManager.getBeatmapSet(ctx);

        if (!beatmapSet) {
            return null;
        }

        return beatmapSet;
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ArrayBuffer | null> {
        const beatmapSet = await this._mirrorManager.downloadBeatmapSet(ctx);

        if (!beatmapSet) {
            return null;
        }

        return beatmapSet;
    }
}
