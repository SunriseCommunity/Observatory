import { ClientAbilities } from '../client/base-client.types';

export type RateLimitOptions = {
    headers?: {
        remaining: string;
        limit?: string;
        reset?: string;
    };
    dailyRateLimit?: number;
    rateLimits: RateLimit[];
    onCooldownUntil?: number; // Active only if we got 429 status code before
};

export type RateLimit = {
    abilities: ClientAbilities[];
    routes: string[]; // ! Make sure this matches the "defaultUrl + route + value" logic
    limit: number;
    reset: number;
};
