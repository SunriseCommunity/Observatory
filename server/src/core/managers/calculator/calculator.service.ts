import * as rosu from 'rosu-pp-js';
import { GameModBitwise } from '../../../types/general/gameMod';
import crypto from 'crypto';
import { Score, ScoreShort } from './calculator.types';

export class CalculatorService {
    public CalculateBeatmapPerfomance(
        beatmap: rosu.Beatmap,
        scores: ScoreShort[],
    ) {
        const results: rosu.PerformanceAttributes[] = [];

        for (const score of scores) {
            if (score.mode != undefined && beatmap.mode != score.mode) {
                beatmap.convert(score.mode, score.mods);
            }

            const performance = new rosu.Performance({
                accuracy: score.accuracy,
                mods: score.mods ?? GameModBitwise.NoMod,
                combo: score.combo,
                misses: score.misses,
                lazer: score.isLazer,
            }).calculate(beatmap);

            results.push(performance);
        }

        return results;
    }

    public CalculateScorePerfomance(beatmap: rosu.Beatmap, score: Score) {
        if (score.mode != undefined && beatmap.mode != score.mode) {
            beatmap.convert(score.mode, score.mods);
        }

        const hitresultPriority = score.isScoreFailed
            ? rosu.HitResultPriority.WorstCase
            : rosu.HitResultPriority.BestCase;

        const performance = new rosu.Performance({
            accuracy: score.accuracy,
            mods: score.mods ?? GameModBitwise.NoMod,
            combo: score.combo,
            n300: score.n300,
            nGeki: score.nGeki,
            n100: score.n100,
            nKatu: score.nKatu,
            n50: score.n50,
            misses: score.misses,
            hitresultPriority: hitresultPriority,
            lazer: score.isLazer,
        }).calculate(beatmap);

        return performance;
    }

    public ConvertBufferToBeatmap(buffer: ArrayBuffer) {
        return new rosu.Beatmap(new Uint8Array(buffer));
    }

    public GetHashOfOsuFile(arrayBuffer: ArrayBuffer) {
        const hash = crypto.createHash('md5');
        hash.update(new Uint8Array(arrayBuffer));
        return hash.digest('hex');
    }
}
