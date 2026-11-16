import { exit } from "node:process";

import { color } from "bun";

export type Mirror
  = | "direct"
    | "bancho"
    | "mino"
    | "osulabs"
    | "gatari"
    | "nerinyan";

const {
  PORT,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  REDIS_PORT,
  REDIS_HOST,
  BANCHO_CLIENT_SECRET,
  BANCHO_CLIENT_ID,
  DEBUG_MODE,
  LOKI_HOST,
  IGNORE_RATELIMIT_KEY,
  RATELIMIT_CALLS_PER_WINDOW,
  RATELIMIT_TIME_WINDOW,
  OSZ_FILES_LIFE_SPAN,
  MIRRORS_TO_IGNORE,
  DISABLE_SAFE_RATELIMIT_MODE,
  DISABLE_DAILY_RATE_LIMIT,
  ENABLE_CRON_TO_CLEAR_OUTDATED_BEATMAPS,
  SHOW_INTERNAL_VALUES_IN_PUBLIC_STATS_ENDPOINT,
  ENABLE_METRICS,
  ENABLE_TRACING,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  USE_US_CATBOY_SERVER_ONLY, // TODO: Hopefully a temporary solution for catboy.best (mino) mirror problems. Consider removing this in the future when the mirror is more stable.
} = process.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD) {
  console.error(
        `${color("#ff0000")} Missing required environment variables for Postgres`,
  );
  exit(1);
}

if (!BANCHO_CLIENT_SECRET || !BANCHO_CLIENT_ID) {
  console.error(
        `${color(
            "#ff0000",
        )} Missing required environment variables for osu! Bancho. It will be disabled`,
  );
}

const config = {
  PORT: PORT || "3000",
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_HOST: POSTGRES_HOST || "0.0.0.0",
  POSTGRES_PORT: POSTGRES_PORT || "5432",
  POSTGRES_DB: POSTGRES_DB || "observatory",
  REDIS_PORT: Number(REDIS_PORT) || 6379,
  BANCHO_CLIENT_SECRET,
  BANCHO_CLIENT_ID,
  REDIS_HOST,
  LOKI_HOST,
  IGNORE_RATELIMIT_KEY,
  RATELIMIT_CALLS_PER_WINDOW: Number(RATELIMIT_CALLS_PER_WINDOW) || 100,
  RATELIMIT_TIME_WINDOW: Number(RATELIMIT_TIME_WINDOW) || 20 * 1000,
  OSZ_FILES_LIFE_SPAN: Number(OSZ_FILES_LIFE_SPAN) || 24,
  IsProduction: Bun.env.NODE_ENV === "production",
  IsAutomatedTesting: Bun.env.NODE_ENV === "test",
  IsDebug: DEBUG_MODE === "true",
  UseBancho: Boolean(BANCHO_CLIENT_SECRET && BANCHO_CLIENT_ID),
  MirrorsToIgnore: MIRRORS_TO_IGNORE?.split(",").map(v => v.trim()) ?? [],
  DisableSafeRatelimitMode: DISABLE_SAFE_RATELIMIT_MODE === "true",
  DisableDailyRateLimit: DISABLE_DAILY_RATE_LIMIT === "true",
  EnableCronToClearOutdatedBeatmaps:
        ENABLE_CRON_TO_CLEAR_OUTDATED_BEATMAPS === "true",
  ShowInternalValuesInPublicStatsEndpoint:
        SHOW_INTERNAL_VALUES_IN_PUBLIC_STATS_ENDPOINT === "true",
  UseUsCatboyServerOnly: USE_US_CATBOY_SERVER_ONLY === "true",
  EnableMetrics: ENABLE_METRICS === "true",
  EnableTracing: ENABLE_TRACING === "true",
  OtlpEndpoint: OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
};

export const observatoryConfigPublic = {
  RATELIMIT_CALLS_PER_WINDOW: config.RATELIMIT_CALLS_PER_WINDOW,
  RATELIMIT_TIME_WINDOW: config.RATELIMIT_TIME_WINDOW,
  OSZ_FILES_LIFE_SPAN: config.OSZ_FILES_LIFE_SPAN,
  IsProduction: config.IsProduction,
  IsAutomatedTesting: config.IsAutomatedTesting,
  IsDebug: config.IsDebug,
  UseBancho: config.UseBancho,
  MirrorsToIgnore: config.MirrorsToIgnore,
  DisableSafeRatelimitMode: config.DisableSafeRatelimitMode,
  DisableDailyRateLimit: config.DisableDailyRateLimit,
  EnableCronToClearOutdatedBeatmaps: config.EnableCronToClearOutdatedBeatmaps,
  UseUsCatboyServerOnly: config.UseUsCatboyServerOnly,
};

export default config;
