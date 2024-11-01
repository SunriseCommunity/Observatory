// Local imports
import { GameMode, GameModeInt } from './gameMode';
import { RankStatus, RankStatusInt } from './rankStatus';
// Type imports
import type { User, UserCompact } from './user';
import type { Failtimes } from './failtimes';
import type { Timestamp } from './timestamp';

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#beatmapsetcompact-covers))
 */
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
    id: number;
    name: string;
}

export interface BeatmapsetLanguage {
    id: number;
    name: string;
}

/**
 * Represents a beatmapset.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#beatmapsetcompact))
 */
export interface BeatmapsetCompact {
    artist: string;
    artist_unicode: string;
    beatmaps?: Beatmap[];
    converts?: Beatmap[];
    covers: Covers;
    creator: string;
    current_user_attributes?: unknown;
    description?: BeatmapsetDescription;
    discussions?: unknown;
    events?: unknown;
    favourite_count: number;
    genre?: BeatmapsetGenre;
    /**
     * Always included in {@link Beatmapset} but optional in {@link BeatmapsetCompact}.
     *
     * ---
     *
     * Documentation wrong, can be undefined even for {@link Beatmapset}s.
     */
    has_favourited?: boolean;
    hype: null | BeatmapsetHype;
    id: number;
    language?: BeatmapsetLanguage;
    nominations?: unknown;
    nsfw: boolean;
    offset: number;
    play_count: number;
    preview_url: string;
    ratings?: number[];
    recent_favourites?: UserCompact[];
    related_users?: unknown;
    /**
     * Always included in {@link Beatmapset} but optional in {@link BeatmapsetCompact}.
     *
     * Can be an empty string.
     */
    source: string;
    spotlight: boolean;
    status: string;
    title: string;
    title_unicode: string;
    track_id?: number | null;
    user?: User;
    user_id: number;
    video: boolean;
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

/**
 * Represents a beatmapset.
 * This extends {@link BeatmapsetCompact} with additional attributes.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#beatmapset))
 */
export interface Beatmapset extends BeatmapsetCompact {
    availability: BeatmapsetAvailability;
    /** Float */
    bpm: number;
    can_be_hyped: boolean;
    /**
     * Username of the mapper at the time of beatmapset creation.
     */
    creator: string;
    discussion_enabled: boolean;
    discussion_locked: boolean;
    /**
     * Is wrong, can be undefined
     */
    //has_favourited?: boolean
    is_scoreable: boolean;
    last_updated: Timestamp;
    legacy_thread_url?: string;
    nominations_summary: BeatmapsetNominationsSummary;
    /**
     * See Rank status for list of possible values.
     */
    ranked?: RankStatusInt;
    ranked_date?: Timestamp | null;
    storyboard: boolean;
    submitted_date?: Timestamp;
    /**
     * Can be an empty string.
     */
    tags: string;
    video: boolean;
}

/**
 * Represent a beatmap.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#beatmapcompact))
 */
export interface BeatmapCompact {
    /**
     * {@link Beatmapset} for {@link Beatmap} object, {@link BeatmapsetCompact} for
     * {@link BeatmapCompact} object.
     *
     * `null` if the beatmap doesn't have associated beatmapset (e.g. deleted).
     */
    beatmapset?: null | Beatmapset | BeatmapsetCompact;
    /**
     * Integer.
     */
    beatmapset_id: number;
    checksum?: string;
    /** Float. */
    difficulty_rating: number;
    failtimes?: Failtimes;
    /** Integer */
    id: number;
    /** Integer */
    max_combo?: number;
    mode: GameMode;
    /**
     * See {@link RankStatus} for list of possible values.
     */
    status: RankStatus;
    /**
     * Integer.
     */
    total_length: number;
    /**
     * Integer.
     */
    user_id: number;
    version: string;
}

/**
 * Represent a beatmap.
 * This extends {@link BeatmapCompact} with additional attributes.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#beatmap)
 */
export interface Beatmap extends BeatmapCompact {
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
    /**
     * See {@link RankStatusInt} for list of possible values.
     *
     * Integer.
     */
    ranked: RankStatusInt;
    url: string;
}

export interface BeatmapsetSearchResult {
    beatmapsets: Beatmapset[];
}
