/**
 * Rank status.
 *
 * ([Source for values from BeatmapsetCompact](https://osu.ppy.sh/docs/index.html#beatmapsetcompact-rank-status))
 *
 * ([Source for information about leaderboards](https://osu.ppy.sh/wiki/en/Beatmap/Category#present-categories))
 */
export enum RankStatus {
    /**
     * They allow players to compete on leaderboards and gain performance points
     * from setting scores.
     */
    APPROVED = 'approved',
    /**
     * These beatmaps do not have leaderboards, but they can still be downloaded
     * and played, and they continue to contribute to play statistics.
     */
    GRAVEYARD = 'graveyard',
    /**
     * They have leaderboards, but no performance points will be awarded and all
     * scores will be deleted if it moves out of Loved.
     */
    LOVED = 'loved',
    /**
     * Work in Progress and Pending beatmaps do not have leaderboards, but
     * contribute to play statistics.
     */
    PENDING = 'pending',
    /**
     * Qualified beatmaps have leaderboards, but no performance points will be
     * awarded and all scores will be deleted when it moves out of Qualified.
     */
    QUALIFIED = 'qualified',
    /**
     * They allow players to compete on leaderboards and gain performance points
     * from setting scores.
     */
    RANKED = 'ranked',
    /**
     * Work in Progress and Pending beatmaps do not have leaderboards, but
     * contribute to play statistics.
     */
    WIP = 'wip',
}

/**
 * Rank status.
 *
 * ([Source for values from BeatmapsetCompact](https://osu.ppy.sh/docs/index.html#beatmapsetcompact-rank-status))
 *
 * ([Source for information about leaderboards](https://osu.ppy.sh/wiki/en/Beatmap/Category#present-categories))
 */
export enum RankStatusInt {
    /**
     * These beatmaps do not have leaderboards, but they can still be downloaded
     * and played, and they continue to contribute to play statistics.
     */
    GRAVEYARD = -2,
    /**
     * Work in Progress and Pending beatmaps do not have leaderboards, but
     * contribute to play statistics.
     */
    WIP = -1,
    /**
     * Work in Progress and Pending beatmaps do not have leaderboards, but
     * contribute to play statistics.
     */
    PENDING = 0,
    /**
     * They allow players to compete on leaderboards and gain performance points
     * from setting scores.
     */
    RANKED = 1,
    /**
     * They allow players to compete on leaderboards and gain performance points
     * from setting scores.
     */
    APPROVED = 2,
    /**
     * Qualified beatmaps have leaderboards, but no performance points will be
     * awarded and all scores will be deleted when it moves out of Qualified.
     */
    QUALIFIED = 3,
    /**
     * They have leaderboards, but no performance points will be awarded and all
     * scores will be deleted if it moves out of Loved.
     */
    LOVED = 4,
}
