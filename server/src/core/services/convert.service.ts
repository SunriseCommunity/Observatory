import { Beatmap, Beatmapset } from '../../types/general/beatmap';
import {
    OsulabsBeatmap,
    OsulabsBeatmapset,
} from '../domains/beatmaps.download/osulabs-client.types';
import {
    MinoBeatmap,
    MinoBeatmapset,
} from '../domains/catboy.best/mino-client.types';
import { DirectBeatmap } from '../domains/osu.direct/direct-client.types';
import {
    BanchoBeatmap,
    BanchoBeatmapset,
} from '../domains/osu.ppy.sh/bancho-client.types';

export class ConvertService {
    private mirror:
        | 'mino'
        | 'bancho'
        | 'direct'
        | 'gatari'
        | 'nerinyan'
        | 'osulabs';

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
            case 'https://osu.gatari.pw':
                this.mirror = 'gatari';
                break;
            case 'https://api.nerinyan.moe':
                this.mirror = 'nerinyan';
                break;
            case 'https://beatmaps.download':
                this.mirror = 'osulabs';
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
            case 'osulabs':
                return this.convertOsulabsBeatmapset(
                    beatmapset as OsulabsBeatmapset,
                );
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
            case 'osulabs':
                return this.convertOsulabsBeatmap(beatmap as OsulabsBeatmap);
            case 'direct':
                return this.convertDirectBeatmap(beatmap as DirectBeatmap);
            default:
                throw new Error('ConvertService: Cannot convert beatmap');
        }
    }

    private convertBacnhoBeatmapset(beatmapset: BanchoBeatmapset): Beatmapset {
        delete beatmapset.current_user_attributes;
        delete beatmapset.recent_favourites;
        delete beatmapset.discussions;
        delete beatmapset.events;
        delete beatmapset.related_tags;

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
        delete beatmap.owners;

        return {
            ...beatmap,
        } as Beatmap;
    }

    private convertDirectBeatmap(beatmap: DirectBeatmap): Beatmap {
        return {
            ...beatmap,
            failtimes: {
                fail: Array(100).fill(0),
                exit: Array(100).fill(0),
            },
        };
    }

    private convertMinoBeatmap(beatmap: MinoBeatmap): Beatmap {
        delete beatmap.set;
        delete beatmap.last_checked;
        delete beatmap.owners;
        delete beatmap.current_user_tag_ids;
        delete beatmap.top_tag_ids;

        return {
            ...beatmap,
            last_updated: new Date(beatmap.last_updated).toISOString(),
        } as Beatmap;
    }

    private convertOsulabsBeatmap(beatmap: OsulabsBeatmap): Beatmap {
        delete beatmap.set;
        delete beatmap.last_checked;
        delete beatmap.owners;
        delete beatmap.current_user_tag_ids;
        delete beatmap.top_tag_ids;

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
        delete beatmapset.related_tags;
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

    private convertOsulabsBeatmapset(
        beatmapset: OsulabsBeatmapset,
    ): Beatmapset {
        delete beatmapset.next_update;
        delete beatmapset.last_checked;
        delete beatmapset.has_favourited;
        delete beatmapset.recent_favourites;
        delete beatmapset.related_tags;
        delete beatmapset.rating;

        return {
            ...beatmapset,
            last_updated: new Date(beatmapset.last_updated).toISOString(),
            beatmaps: beatmapset.beatmaps?.map((beatmap) =>
                this.convertOsulabsBeatmap(beatmap),
            ),
            converts: beatmapset.converts?.map((beatmap) =>
                this.convertOsulabsBeatmap(beatmap),
            ),
        } as Beatmapset;
    }
}
