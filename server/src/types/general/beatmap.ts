import { Failtimes } from './failtimes';
import { GameMode, GameModeInt } from './gameMode';
import { RankStatus, RankStatusInt } from './rankStatus';
import { Timestamp } from './timestamp';
import { User, UserCompact } from './user';

export interface Beatmapset {
    id: number;
    artist: string;
    artist_unicode: string;
    /** Username of the mapper at the time of beatmapset creation. */
    creator: string;
    source: string;
    /** Can be an empty string. */
    tags: string;
    title: string;
    title_unicode: string;
    covers: Covers;
    favourite_count: number;
    hype: BeatmapsetHype;
    nsfw: boolean;
    offset: number;
    play_count: number;
    preview_url: string;
    spotlight: boolean;
    status: RankStatus;
    track_id?: number | null;
    user_id: number;
    video: boolean;
    /** Float */
    bpm: number;
    can_be_hyped: boolean;
    deleted_at?: Timestamp | null;
    discussion_enabled: boolean;
    discussion_locked: boolean;
    is_scoreable: boolean;
    last_updated: Timestamp;
    legacy_thread_url?: string;
    nominations_summary: BeatmapsetNominationsSummary;
    ranked: RankStatusInt;
    ranked_date?: Timestamp | null;
    storyboard: boolean;
    submitted_date?: Timestamp;
    availability: BeatmapsetAvailability;
    has_favourited?: boolean;
    beatmaps?: Beatmap[];
    converts?: Beatmap[];
    current_nominations?: unknown;
    description?: BeatmapsetDescription;
    genre?: BeatmapsetGenre;
    langauge?: BeatmapsetLanguage;
    pack_tags?: string[];
    ratings?: number[];
    related_users?: UserCompact[];

    user?: UserCompact;

    /** Not parsed values */
    related_tags: any;
}

export interface Beatmap {
    /** Integer */
    beatmapset_id: number;
    /** Float. */
    difficulty_rating: number;
    /** Integer */
    id: number;
    mode: GameMode;
    status: RankStatus;
    /** Integer */
    total_length: number;
    /** Integer */
    user_id: number;
    version: string;
    /** Float */
    accuracy: number;
    /** Float */
    ar: number;
    /** Float */
    bpm?: number;
    convert: boolean;
    /** Integer */
    count_circles: number;
    /** Integer */
    count_sliders: number;
    /** Integer */
    count_spinners: number;
    /** Float */
    cs: number;
    deleted_at?: Timestamp | null;
    /** Float */
    drain: number;
    /** Integer */
    hit_length: number;
    is_scoreable: boolean;
    last_updated: Timestamp;
    /** Integer */
    mode_int: GameModeInt;
    /** Integer */
    passcount: number;
    /** Integer */
    playcount: number;
    ranked: RankStatusInt;
    url: string;
    checksum?: string;
    failtimes?: Failtimes;
    /** Integer */
    max_combo?: number;

    /** Not parsed values */
    owners?: any;
    current_user_tag_ids?: any;
    top_tag_ids?: any;
}

export interface Covers {
    card: string;
    'card@2x': string;
    cover: string;
    'cover@2x': string;
    list: string;
    'list@2x': string;
    slimcover: string;
    'slimcover@2x': string;
}

export interface BeatmapsetDescription {
    description: string;
}

export interface BeatmapsetGenre {
    id?: number;
    name: string;
}

export interface BeatmapsetLanguage {
    id: number;
    name: string;
}

export interface BeatmapsetAvailability {
    download_disabled: boolean;
    more_information?: string | null;
}

export interface BeatmapsetHype {
    /** Integer */
    current?: number;
    /** Integer */
    required?: number;
}

export interface BeatmapsetNominationsSummary {
    /** Integer */
    current?: number;
    /** Integer */
    required?: number;
}
