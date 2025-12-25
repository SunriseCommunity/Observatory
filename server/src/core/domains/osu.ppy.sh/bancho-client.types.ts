import type { Beatmap, Beatmapset } from "../../../types/general/beatmap";
import type { UserCompact } from "../../../types/general/user";

export type OsuApiCredentialsRequest = {
  client_id: string;
  client_secret: string;
  grant_type: string;
  scope: string;
};

export type OsuApiCredentialsResponse = {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
};

export type OsuApiCredentials = {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
  expires_on: number;
};

export interface BanchoBeatmapset extends Beatmapset {
  current_user_attributes?: unknown;
  discussions?: unknown;
  events?: unknown;
  recent_favourites?: UserCompact[];
  beatmaps?: BanchoBeatmap[];
  converts?: BanchoBeatmap[];
}

export interface BanchoBeatmap extends Beatmap {
  /** `null` if the beatmap doesn't have associated beatmapset (e.g. deleted). */
  beatmapset?: null | BanchoBeatmapset;
  current_user_attributes?: unknown;
  discussions?: unknown;
  events?: unknown;
  recent_favourites?: UserCompact[];
}

export interface BanchoBeatmapsetSearchResult {
  beatmapsets: BanchoBeatmapset[];
}
