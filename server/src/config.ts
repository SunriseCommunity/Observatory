import { color } from 'bun';
import dotenv from 'dotenv';
import { exit } from 'process';

dotenv.config();

const {
    PORT,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    REDIS_PORT,
    BANCHO_CLIENT_SECRET,
    BANCHO_CLIENT_ID,
    DEBUG_MODE,
    LOKI_HOST,
    IGNORE_RATELIMIT_KEY,
    RATELIMIT_CALLS_PER_WINDOW,
    RATELIMIT_TIME_WINDOW,
} = process.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD) {
    console.error(
        `${color('#ff0000')} Missing required environment variables for Postgres`,
    );
    exit(1);
}

if (!BANCHO_CLIENT_SECRET || !BANCHO_CLIENT_ID) {
    console.error(
        `${color(
            '#ff0000',
        )} Missing required environment variables for osu! Bancho. It will be disabled`,
    );
}

const config: {
    PORT: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;
    POSTGRES_DB: string;
    REDIS_PORT: number;
    BANCHO_CLIENT_SECRET?: string;
    BANCHO_CLIENT_ID?: string;
    LOKI_HOST: string;
    IGNORE_RATELIMIT_KEY?: string;
    RATELIMIT_CALLS_PER_WINDOW: number;
    RATELIMIT_TIME_WINDOW: number;
    IsProduction: boolean;
    IsDebug: boolean;
    UseBancho: boolean;
} = {
    PORT: PORT || '3000',
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_HOST: POSTGRES_HOST || 'localhost',
    POSTGRES_PORT: POSTGRES_PORT || '5432',
    POSTGRES_DB: POSTGRES_DB || 'observatory',
    REDIS_PORT: Number(REDIS_PORT) || 6379,
    BANCHO_CLIENT_SECRET,
    BANCHO_CLIENT_ID,
    LOKI_HOST: LOKI_HOST || 'http://localhost:3100',
    IGNORE_RATELIMIT_KEY: IGNORE_RATELIMIT_KEY,
    RATELIMIT_CALLS_PER_WINDOW: Number(RATELIMIT_CALLS_PER_WINDOW) || 100,
    RATELIMIT_TIME_WINDOW: Number(RATELIMIT_TIME_WINDOW) || 20 * 1000,
    IsProduction: Bun.env.NODE_ENV === 'production',
    IsDebug: DEBUG_MODE === 'true',
    UseBancho: BANCHO_CLIENT_SECRET && BANCHO_CLIENT_ID ? true : false,
};

export default config;
