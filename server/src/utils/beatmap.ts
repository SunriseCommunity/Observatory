import * as rosu from 'osu-pp-js';

export function TryConvertToGamemode(value: any) {
    return Object.values(rosu.GameMode).includes(value as rosu.GameMode)
        ? (value as rosu.GameMode)
        : undefined;
}
