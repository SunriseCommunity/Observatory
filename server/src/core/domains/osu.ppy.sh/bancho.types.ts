type OsuCredentialsGrantResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: "Bearer";
};

type DiscordUserResponse = {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  email?: string;
  verified?: boolean;
  public_flags: number;
  flags: number;
  banner: string | null;
  banner_color: string | null;
  accent_color: string | null;
  locale: string;
  mfa_enabled: boolean;
};

type OsuRequestAccountData = {
  expires_in: number;
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
};

type OsuAccountData = {
  expires_on: number;
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
};

type OsuApiCredentialsRequest = {
  client_id: string;
  client_secret: string;
  grant_type: string;
  scope: string;
};

type OsuApiCredentialsResponse = {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
};

type OsuApiCredentials = {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
  expires_on: number;
};

type StringMenuOption = {
  label: string;
  description: string;
  value: string;
};

type OsuProfile = {
  avatar_url: string;
  country_code: string;
  default_group: string;
  id: number;
  is_active: true;
  is_bot: boolean;
  is_deleted: boolean;
  is_online: boolean;
  is_supporter: boolean;
  last_visit?: string; //https://osu.ppy.sh/docs/index.html#timestamp
  pm_friends_only: false;
  profile_colour?: string;
  username: string;
  cover_url: string;
  discord?: string;
  has_supported: boolean;
  interests?: string;
  join_date: string;
  kudosu: { total: number; available: number };
  location?: string;
  max_blocks: number;
  max_friends: number;
  occupation?: string;
  playmode: "osu" | "mania" | "taiko" | "fruits";
  playstyle: string[];
  post_count: number;
  profile_order: string[];
  title?: string;
  title_url?: string;
  twitter?: string;
  website?: string;
  country: { code: string; name: string };
  cover: {
    custom_url: string;
    url: string;
    id: number;
  };
  account_history: [];
  active_tournament_banner?: [];
  badges: [];
  beatmap_playcounts_count: number;
  comments_count: number;
  favourite_beatmapset_count: number;
  follower_count: number;
  graveyard_beatmapset_count: number;
  groups: [];
  guest_beatmapset_count: number;
  loved_beatmapset_count: number;
  mapping_follower_count: number;
  monthly_playcounts: object[];
  nominated_beatmapset_count: number;
  page: {
    html: string;
    raw: string;
  };
  pending_beatmapset_count: number;
  previous_usernames: string[];
  rank_highest: { rank: number; updated_at: Date };
  ranked_beatmapset_count: number;
  replays_watched_counts: object[];
  scores_best_count: number;
  scores_first_count: number;
  scores_pinned_count: number;
  scores_recent_count: number;
  statistics: {
    level: [];
    global_rank: number;
    global_rank_exp: number;
    pp: number;
    pp_exp: number;
    ranked_score: number;
    hit_accuracy: number;
    play_count: number;
    play_time: number;
    total_score: number;
    total_hits: number;
    maximum_combo: number;
    replays_watched_by_others: number;
    is_ranked: true;
    grade_counts: [];
    country_rank: number;
    rank: [];
  };
  support_level: number;
  user_achievements: object[];
  rank_history: { mode: string; data: [] };
  rankHistory: { mode: string; data: [] };
  ranked_and_approved_beatmapset_count: number;
  unranked_beatmapset_count: number;
};

export {
  OsuAccountData,
  OsuRequestAccountData,
  OsuApiCredentials,
  OsuApiCredentialsRequest,
  OsuApiCredentialsResponse,
};
