import { GameMode } from './gameMode';

import type { ColorCode } from './colorCode';
import type { Timestamp } from './timestamp';

export interface UserCompactCover {
    custom_url: null | unknown;
    id: null | string;
    url: string;
}

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#user-profilepage))
 */
export enum ProfilePage {
    BEATMAPS = 'beatmaps',
    HISTORICAL = 'historical',
    KUDOSU = 'kudosu',
    ME = 'me',
    MEDALS = 'medals',
    RECENT_ACTIVITY = 'recent_activity',
    TOP_RANKS = 'top_ranks',
}

export interface UserStatisticsRulesets {
    fruits: UserStatistics;
    mania: UserStatistics;
    osu: UserStatistics;
    taiko: UserStatistics;
}

export interface UserMonthlyPlaycount {
    count: number;
    start_date: Timestamp;
}

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#group))
 */
export interface GroupDescription {
    html: string;
    markdown: string;
}

/**
 * This object is not returned by any endpoints yet.
 * It is here only as a reference for {@link UserGroup}.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#group))
 */
export interface Group {
    colour?: ColorCode;
    /** Whether this group displays a listing at `/groups/{id}`. */
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     */
    description?: GroupDescription;
    has_listing: boolean;
    /**
 Whether this group associates GameModes with users' memberships.
id 	number.
     */
    has_playmodes: boolean;
    id: number;
    /**
     * Unique string to identify the group.
     *
     * @example bng
     */
    identifier: string;
    /** Whether members of this group are considered probationary. */
    is_probationary: boolean;
    /**
     * @example Beatmap Nominators
     */
    name: string;
    /**
     * Short name of the group for display.
     *
     * @example BN
     */
    short_name: string;
}

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#usergroup))
 */
export interface UserGroup extends Group {
    /**
     * {@link GameMode}s associated with this membership (`null` if `has_playmodes` is unset).
     */
    playmodes?: GameMode[] | null;
}

/**
 * ([Source(https://osu.ppy.sh/docs/index.html#usercompact-useraccounthistory)])
 */
export enum UserAccountHistoryType {
    NOTE = 'note',
    RESTRICTION = 'restriction',
    SILENCE = 'silence',
}

/**
 * ([Source(https://osu.ppy.sh/docs/index.html#usercompact-useraccounthistory)])
 */
export interface UserAccountHistory {
    description?: string;
    id: number;
    /** In seconds. */
    length: number;
    permanent: boolean;
    timestamp: Timestamp;
    type: UserAccountHistoryType;
}

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#usercompact-profilebanner))
 */
export interface UserProfileBanner {
    id: number;
    image: string;
    tournament_id: number;
}

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#usercompact-userbadge))
 */
export interface UserBadge {
    awarded_at: Timestamp;
    description: string;
    image_url: string;
    /**
     * Sometimes the URL can be an empty string.
     */
    url: string;
}

export interface UserCompactCountry {
    code: string;
    name: string;
}

export interface UserStatisticsLevel {
    current: number;
    progress: number;
}

export interface UserStatisticsGradeCounts {
    a: number;
    s: number;
    sh: number;
    ss: number;
    ssh: number;
}

/**
 * ([Source](https://osu.ppy.sh/docs/index.html#userstatistics))
 */
export interface UserStatistics {
    country_rank?: number;
    global_rank?: number;
    grade_counts: UserStatisticsGradeCounts;
    hit_accuracy: number;
    is_ranked: boolean;
    level: UserStatisticsLevel;
    maximum_combo: number;
    play_count: number;
    play_time: number;
    pp: number;
    ranked_score: number;
    replays_watched_by_others: number;
    total_hits: number;
    total_score: number;
    variants?: UserGameModeVariant[];
}

export interface UserAchievement {
    achieved_at: Timestamp;
    achievement_id: number;
}

export interface UserCompactPage {
    /**
     * The me page HTML content.
     *
     * Is an empty string if the user has no page.
     */
    html: string;
    /**
     * The me page raw text content.
     *
     * Is an empty string if the user has no page.
     */
    raw: string;
}

export interface UserReplaysWatchedCount {
    count: number;
    start_date: Timestamp;
}

export enum Playstyle {
    KEYBOARD = 'keyboard',
    MOUSE = 'mouse',
    TABLET = 'tablet',
    TOUCH = 'touch',
}

/**
 * Mainly used for embedding in certain responses to save additional api lookups.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#usercompact))
 */
export interface UserCompact {
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    account_history?: UserAccountHistory[];
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * `null` if the user has no active tournament banner.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    active_tournament_banner?: UserProfileBanner | null;
    /**
     * Url of user's avatar.
     */
    avatar_url: string;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    badges?: UserBadge[];
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointMe} object.
     */
    beatmap_playcounts_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     */
    blocks?: unknown;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    comments_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link User} object.
     */
    country?: UserCompactCountry;
    /**
     * Two-letter code representing user's country.
     */
    country_code: string;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link User} object.
     */
    cover?: UserCompactCover;
    /**
     * Identifier of the default group the user belongs to.
     */
    default_group: string;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    favourite_beatmapset_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    follower_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     */
    friends?: unknown;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    graveyard_beatmapset_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    groups?: UserGroup[];
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    guest_beatmapset_count?: number;
    /**
     * Unique identifier for user.
     */
    id: number;
    /**
     * Has this account been active in the last x months?
     */
    is_active: boolean;
    /**
     * Is this a bot account?
     */
    is_bot: boolean;
    /**
     * Account was deleted.
     */
    is_deleted: boolean;
    /**
     * Is the user currently online? (either on lazer or the new website).
     */
    is_online: boolean;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link User} object if this is the currently authenticated user.
     *
     * This is included in a {@link UserEndpointMe} object.
     */
    is_restricted?: boolean;
    /**
     * Does this user have supporter?
     */
    is_supporter: boolean;
    /**
     * Last access time.
     * `null` if the user hides online presence.
     *
     * This is included in a {@link UserEndpointGet}/{@link UserEndpointSearchUser} object.
     */
    last_visit?: Timestamp | null;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    loved_beatmapset_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    mapping_follower_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    monthly_playcounts?: UserMonthlyPlaycount[];
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * If the user has never edited their page (never supported osu!) this key will not be undefined.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    page?: UserCompactPage;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    pending_beatmapset_count?: number;
    /**
     * Whether or not the user allows PM from other than friends.
     */
    pm_friends_only: boolean;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    previous_usernames?: string[];
    /**
     * Colour of username/profile highlight.
     *
     * This is included in a {@link UserEndpointGet}/{@link UserEndpointSearchUser} object.
     */
    profile_colour?: ColorCode | null;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    rank_history?: UserRankHistory;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    ranked_beatmapset_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    replays_watched_counts?: UserReplaysWatchedCount[];
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    scores_best_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    scores_first_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    scores_pinned_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    scores_recent_count?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    statistics?: UserStatistics;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointMe} object.
     */
    statistics_rulesets: UserStatisticsRulesets;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    support_level?: number;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     */
    unread_pm_count?: unknown;
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    user_achievements?: UserAchievement[];
    /**
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     */
    user_preferences?: unknown;
    /**
     * User's display name.
     */
    username: string;
}

export interface UserRankHistory {
    data: number[];
    mode: GameMode;
}

export interface UserCompactKusodo {
    available: number;
    total: number;
}

export interface UserCompactCountry {
    code: string;
    name: string;
}

export enum GameModeVariant {
    MANIA_4K = '4k',
    MANIA_7K = '7k',
}

export interface UserGameModeVariant {
    country_rank: number | null;
    global_rank: number | null;
    mode: GameMode;
    pp: number;
    variant: GameModeVariant;
}

/**
 * Is the same as the {@link User} object but some optional attributes on {@link User} are included.
 *
 * ---
 *
 * This type information is not official but was collected looking at responses.
 * For type safety just treat this object like a {@link User} object.
 *
 * [[include:example_output/users_get_9096716.md]]
 * [[include:example_output/users_get_Ooi.md]]
 */
export interface UserEndpointGet extends User {
    account_history: UserAccountHistory[];
    active_tournament_banner: UserProfileBanner | null;
    badges: UserBadge[];
    beatmap_playcounts_count: number;
    comments_count: number;
    discord: string | null;
    favourite_beatmapset_count: number;
    follower_count: number;
    graveyard_beatmapset_count: number;
    groups: UserGroup[];
    guest_beatmapset_count: number;
    interests: string | null;
    last_visit: Timestamp | null;
    location: string | null;
    loved_beatmapset_count: number;
    mapping_follower_count: number;
    monthly_playcounts: UserMonthlyPlaycount[];
    occupation: string | null;
    page: UserCompactPage;
    pending_beatmapset_count: number;
    previous_usernames: string[];
    profile_colour: ColorCode | null;
    rank_history: UserRankHistory;
    ranked_beatmapset_count: number;
    replays_watched_counts: UserReplaysWatchedCount[];
    scores_best_count: number;
    scores_first_count: number;
    scores_pinned_count: number;
    scores_recent_count: number;
    statistics: UserStatistics;
    support_level: number;
    title: string | null;
    title_url: string | null;
    twitter: string | null;
    user_achievements: UserAchievement[];
    website: string | null;
}

/**
 * Is the same as the {@link UserEndpointGet}/{@link User} object but some optional attributes on {@link UserEndpointGet}/{@link User} are included.
 *
 * ---
 *
 * This type information is not official but was collected looking at responses.
 * For type safety just treat this object like a {@link User} object.
 *
 * [[include:example_output/users_me_nothing.md]]
 */
export interface UserEndpointMe extends UserEndpointGet {
    is_restricted: boolean;
    statistics_rulesets: UserStatisticsRulesets;
}

/**
 * Is the same as the {@link UserCompact} object but some optional attributes on {@link UserCompact} are included.
 *
 * ---
 *
 * This type information is not official but was collected looking at responses.
 * For type safety just treat this object like a {@link UserCompact} object.
 */
export interface UserEndpointSearchUser extends UserCompact {
    last_visit: Timestamp | null;
    profile_colour: ColorCode | null;
}

/**
 * Represents a User.
 * Extends {@link UserCompact} with additional attributes.
 * In addition, some optional attributes on {@link UserCompact} are included.
 *
 * [[include:example_output/users_get_9096716.md]]
 * [[include:example_output/users_get_Ooi.md]]
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#user))
 */
export interface User extends UserCompact {
    country: UserCompactCountry;
    cover: UserCompactCover;
    /**
     * Discord name.
     * `null` if the user has it not set in the settings.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    discord?: string | null;
    /**
     * Whether or not ever being a supporter in the past.
     */
    has_supported: boolean;
    /**
     * Interests string.
     * `null` if the user has it not set in the settings.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    interests?: string | null;
    is_restricted?: boolean;
    /**
     * Date since when the user account exists.
     */
    join_date: Timestamp;
    /**
     * https://osu.ppy.sh/wiki/en/Modding/Kudosu
     */
    kudosu: UserCompactKusodo;
    /**
     * Location string.
     * `null` if the user has it not set in the settings.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    location?: string | null;
    /**
     * Maximum number of users allowed to be blocked.
     */
    max_blocks: number;
    /**
     * Maximum number of friends allowed to be added.
     */
    max_friends: number;
    /**
     * Occupation string.
     * `null` if the user has it not set in the settings.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    occupation?: string | null;
    /**
     * The default game mode the user is playing.
     */
    playmode: GameMode;
    /**
     * Device choices of the user.
     * `null` if the user has it not set in the settings.
     */
    playstyle: Playstyle[] | null;
    /**
     * Number of forum posts.
     *
     * Integer
     */
    post_count: number;
    /**
     * Ordered array of sections in user profile page.
     */
    profile_order: ProfilePage[];
    /**
     * User-specific title.
     * `null` if the user has no title.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    title?: string | null;
    /**
     * User-specific title URL.
     * `null` if the user has no title URL.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    title_url?: string | null;
    /**
     * Twitter name.
     * `null` if the user has it not set in the settings.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    twitter?: string | null;
    /**
     * Exists for profiles that have mania as their default game mode.
     */
    variants?: UserGameModeVariant[];
    /**
     * Website string.
     * `null` if the user has it not set in the settings.
     *
     * ---
     *
     * May be additionally included in the response.
     * Relevant endpoints should list them if applicable.
     *
     * This is included in a {@link UserEndpointGet} object.
     */
    website?: string | null;
}
