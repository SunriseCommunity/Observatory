/**
 * Available game modes.
 *
 * ([Source](https://osu.ppy.sh/docs/index.html#gamemode))
 */
export enum GameMode {
    /** Osu!catch */
    OSU_CATCH = 'fruits',
    /** Osu!mania */
    OSU_MANIA = 'mania',
    /** Osu!standard */
    OSU_STANDARD = 'osu',
    /** Osu!taiko */
    OSU_TAIKO = 'taiko',
}

/**
 * Available game modes integer codes.
 *
 * ([Undocumented but can be found in Score](https://osu.ppy.sh/docs/index.html#score))
 */
export enum GameModeInt {
    /** Osu!catch */
    OSU_CATCH = 2,
    /** Osu!mania */
    OSU_MANIA = 1,
    /** Osu!standard */
    OSU_STANDARD = 0,
    /** Osu!taiko */
    OSU_TAIKO = 3,
}
