import * as rosu from 'rosu-pp-js';
import { GameModBitwise } from '../../types/general/gameMod';
import crypto from 'crypto';

export class CalculatorService {
    public CalculateBeatmapPerfomance(
        beatmap: rosu.Beatmap,
        accuracies: number[],
        mode: rosu.GameMode,
        mods?: GameModBitwise,
        combo?: number,
        misses?: number,
    ) {
        if (beatmap.mode != mode) {
            beatmap.convert(mode);
        }

        const results: rosu.PerformanceAttributes[] = [];

        for (const accuracy of accuracies) {
            const performance = new rosu.Performance({
                accuracy: accuracy,
                mods: mods ?? GameModBitwise.NoMod,
                combo: combo,
                misses: misses,
            }).calculate(beatmap);

            results.push(performance);
        }

        return results;
    }

    public CalculateScorePerfomance(
        beatmap: rosu.Beatmap,
        accuracy: number,
        mode: rosu.GameMode,
        mods: GameModBitwise,
        combo: number,
        n300: number,
        nGeki: number,
        n100: number,
        nKatu: number,
        n50: number,
        misses: number,
        isScoreFailed: boolean = true,
    ) {
        if (beatmap.mode != mode) {
            beatmap.convert(mode);
        }

        const performance = new rosu.Performance({
            accuracy,
            mods,
            combo,
            n300,
            nGeki,
            n100,
            nKatu,
            n50,
            misses,
            hitresultPriority: isScoreFailed
                ? rosu.HitResultPriority.WorstCase
                : rosu.HitResultPriority.BestCase,
        }).calculate(beatmap);

        return performance;
    }

    public ConvertBufferToBeatmap(buffer: ArrayBuffer) {
        return new rosu.Beatmap(new Uint8Array(buffer));
    }

    public TryConvertToGamemode(value: any) {
        return Object.values(rosu.GameMode).includes(value as rosu.GameMode)
            ? (value as rosu.GameMode)
            : undefined;
    }

    public GetHashOfOsuFile(arrayBuffer: ArrayBuffer) {
        const hash = crypto.createHash('md5');
        hash.update(new Uint8Array(arrayBuffer));
        return hash.digest('hex');
    }
}
