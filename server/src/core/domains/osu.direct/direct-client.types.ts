type DirectBeatmap = {
    beatmapset_id: number;
    difficulty_rating: number;
    id: number;
    mode: string;
    status: string;
    total_length: number;
    user_id: number;
    version: string;
    accuracy: number;
    ar: number;
    bpm: number;
    convert: boolean;
    count_circles: number;
    count_sliders: number;
    count_spinners: number;
    cs: number;
    deleted_at: string | null;
    drain: number;
    hit_length: number;
    is_scoreable: boolean;
    last_updated: string;
    mode_int: number;
    passcount: number;
    playcount: number;
    ranked: number;
    url: string;
    checksum: string;
    max_combo: number;
};

type CoverImages = {
    cover: string;
    'cover@2x': string;
    card: string;
    'card@2x': string;
    list: string;
    'list@2x': string;
    slimcover: string;
    'slimcover@2x': string;
};

type NominationsSummary = {
    current: number;
    eligible_main_rulesets: string[];
    required_meta: {
        main_ruleset: number;
        non_main_ruleset: number;
    };
};

type Availability = {
    download_disabled: boolean;
    more_information: string | null;
};

type DirectBeatmapSet = {
    id: number;
    title: string;
    title_unicode: string;
    artist: string;
    artist_unicode: string;
    creator: string;
    source: string;
    tags: string;
    covers: CoverImages;
    favourite_count: number;
    hype: number | null;
    nsfw: boolean;
    offset: number;
    play_count: number;
    preview_url: string;
    spotlight: boolean;
    status: string;
    track_id: number | null;
    user_id: number;
    video: boolean;
    bpm: number;
    can_be_hyped: boolean;
    deleted_at: string | null;
    discussion_enabled: boolean;
    discussion_locked: boolean;
    is_scoreable: boolean;
    last_updated: string;
    legacy_thread_url: string;
    nominations_summary: NominationsSummary;
    ranked: number;
    ranked_date: string;
    storyboard: boolean;
    submitted_date: string;
    availability: Availability;
    has_favourited: boolean;
    beatmaps: DirectBeatmap[];
    pack_tags: string[];
    modes: number[];
    last_checked: string;
};

export { DirectBeatmap, DirectBeatmapSet };
