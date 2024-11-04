import { Beatmap, Beatmapset } from '../../types/general/beatmap';
import {
    MinoBeatmap,
    MinoBeatmapset,
} from '../domains/catboy.best/mino-client.types';
import {
    BanchoBeatmap,
    BanchoBeatmapset,
} from '../domains/osu.ppy.sh/bancho-client.types';

export class ConvertService {
    private mirror: 'mino' | 'bancho' | 'direct';

    constructor(mirror: string) {
        switch (mirror) {
            case 'https://osu.ppy.sh':
                this.mirror = 'bancho';
                break;
            case 'https://catboy.best':
                this.mirror = 'mino';
                break;
            case 'https://osu.direct/api':
                this.mirror = 'direct';
                break;
            default:
                throw new Error('ConvertService: Invalid mirror provided');
        }
    }

    public convertBeatmapset<T extends Beatmapset>(beatmapset: T): Beatmapset {
        switch (this.mirror) {
            case 'bancho':
                return this.convertBacnhoBeatmapset(
                    beatmapset as BanchoBeatmapset,
                );
            case 'mino':
                return this.convertMinoBeatmapset(beatmapset as MinoBeatmapset);
            default:
                throw new Error('ConvertService: Cannot convert beatmapset');
        }
    }

    public convertBeatmap<T extends Beatmap>(beatmap: T): Beatmap {
        switch (this.mirror) {
            case 'bancho':
                return this.convertBanchoBeatmap(beatmap as BanchoBeatmap);
            case 'mino':
                return this.convertMinoBeatmap(beatmap as MinoBeatmap);
            default:
                throw new Error('ConvertService: Cannot convert beatmap');
        }
    }

    private convertBacnhoBeatmapset(beatmapset: BanchoBeatmapset): Beatmapset {
        delete beatmapset.current_user_attributes;
        delete beatmapset.recent_favourites;
        delete beatmapset.discussions;
        delete beatmapset.events;

        return {
            ...beatmapset,
            beatmaps: beatmapset.beatmaps?.map((beatmap) =>
                this.convertBanchoBeatmap(beatmap),
            ),
            converts: beatmapset.converts?.map((beatmap) =>
                this.convertBanchoBeatmap(beatmap),
            ),
        } as Beatmapset;
    }

    private convertBanchoBeatmap(beatmap: BanchoBeatmap): Beatmap {
        delete beatmap.beatmapset;

        return {
            ...beatmap,
        } as Beatmap;
    }

    private convertMinoBeatmap(beatmap: MinoBeatmap): Beatmap {
        delete beatmap.set;
        delete beatmap.last_checked;

        return {
            ...beatmap,
            last_updated: new Date(beatmap.last_updated).toISOString(),
        } as Beatmap;
    }

    private convertMinoBeatmapset(beatmapset: MinoBeatmapset): Beatmapset {
        delete beatmapset.next_update;
        delete beatmapset.last_checked;
        delete beatmapset.has_favourited;
        delete beatmapset.recent_favourites;
        delete beatmapset.rating;

        return {
            ...beatmapset,
            last_updated: new Date(beatmapset.last_updated).toISOString(),
            beatmaps: beatmapset.beatmaps?.map((beatmap) =>
                this.convertMinoBeatmap(beatmap),
            ),
            converts: beatmapset.converts?.map((beatmap) =>
                this.convertMinoBeatmap(beatmap),
            ),
        } as Beatmapset;
    }
}
