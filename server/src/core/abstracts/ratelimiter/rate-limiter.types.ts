export type RateLimitOptions = {
    headers?: {
        remaining: string;
        limit?: string;
        reset?: string;
    };
    rateLimits: RateLimit[];
};

export type RateLimit = {
    route: string; // ! NOTE: Make sure this matches the "defaultUrl + route + value" logic
    limit: number;
    reset: number;
    onCooldownUntil?: number; // Active only if we got 429 status code
};
