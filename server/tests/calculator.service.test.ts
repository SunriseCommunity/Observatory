import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'bun:test';

import * as rosu from 'rosu-pp-js';
import { CalculatorService } from '../src/core/managers/calculator/calculator.service';
import { GameModBitwise } from '../src/types/general/gameMod';
import { TryConvertToGamemode } from '../src/utils/beatmap';
import {
    ScoreShort,
    Score,
} from '../src/core/managers/calculator/calculator.types';

describe('Calculator tests', () => {
    const calculatorService = new CalculatorService();

    let beatmapBuffer = null! as ArrayBuffer;
    let beatmap = null! as rosu.Beatmap;

    beforeAll(async () => {
        beatmapBuffer = await Bun.file(
            `${import.meta.dir}/data/2809623.osu.test`,
        ).arrayBuffer();
    });

    beforeEach(() => {
        beatmap = calculatorService.ConvertBufferToBeatmap(beatmapBuffer);
    });

    afterEach(() => {
        beatmap.free();
    });

    it('Valid beatmap mode should be parsed', async () => {
        const beatmapMode = TryConvertToGamemode(3) ?? beatmap.mode;

        expect(beatmapMode).toBe(rosu.GameMode.Mania);
    });

    it('Invalid beatmap mode should be defaulted to std', async () => {
        const beatmapMode = TryConvertToGamemode(5) ?? beatmap.mode;

        expect(beatmapMode).toBe(rosu.GameMode.Osu);
    });

    it('Should calculate multiple acc values', async () => {
        const accuracies = [100, 99, 98, 95];

        const scores: ScoreShort[] = accuracies.map((a) => {
            return { accuracy: a, isLazer: false, isScoreFailed: false };
        });

        const results = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            scores,
        );

        expect(results.length).toBe(accuracies.length);
    });

    it('Should apply DT mod', async () => {
        const scores: ScoreShort[] = [
            {
                accuracy: 100,
                isLazer: false,
                isScoreFailed: false,
            },
        ];

        const scoresWithDT = scores.map((s) => {
            return {
                ...s,
                mods: GameModBitwise.DoubleTime,
            };
        });

        const perfomanceWithoutMod =
            calculatorService.CalculateBeatmapPerfomance(beatmap, scores);

        const perfomanceWithMod = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            scoresWithDT,
        );

        expect(perfomanceWithMod[0].difficulty.stars).toBeGreaterThan(
            perfomanceWithoutMod[0].difficulty.stars,
        );
    });

    it('Should convert beatmap to another gamemode', async () => {
        const scoresInStd: ScoreShort[] = [
            {
                accuracy: 100,
                mode: rosu.GameMode.Osu,
                isLazer: false,
                isScoreFailed: false,
            },
        ];

        const scoresInTaiko = scoresInStd.map((s) => {
            return {
                ...s,
                mode: rosu.GameMode.Taiko,
            };
        });

        const perfomanceStandard = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            scoresInStd,
        );

        const perfomanceTaiko = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            scoresInTaiko,
        );

        expect(perfomanceTaiko[0].difficulty.isConvert).toBe(true);
        expect(perfomanceStandard[0].difficulty.stars).not.toEqual(
            perfomanceTaiko[0].difficulty.stars,
        );
    });

    it('Should calculate score pp: standard', async () => {
        const EXPECTED_PP = 243.002; // https://osu.ppy.sh/scores/4502844247

        const score: Score = {
            accuracy: 97.13,
            mods: GameModBitwise.Hidden,
            combo: 956,
            n300: 1869,
            n100: 34,
            n50: 1,
            misses: 32,
            isLazer: false,
            isScoreFailed: false,
        };

        const result = calculatorService.CalculateScorePerfomance(
            beatmap,
            score,
        );

        expect(result.pp).toBeWithin(EXPECTED_PP - 0.001, EXPECTED_PP + 0.001);
    });

    it('Should calculate score pp: taiko', async () => {
        const EXPECTED_PP = 97.975; // https://osu.ppy.sh/scores/1867539282

        const score: Score = {
            accuracy: 91.64,
            mods: GameModBitwise.HalfTime,
            mode: rosu.GameMode.Taiko,
            combo: 516,
            nGeki: 2577,
            nKatu: 240,
            misses: 126,
            isLazer: false,
            isScoreFailed: false,
        };

        const result = calculatorService.CalculateScorePerfomance(
            beatmap,
            score,
        );

        expect(result.pp).toBeWithin(EXPECTED_PP - 0.001, EXPECTED_PP + 0.001);
    });

    it('Should calculate score pp: catch', async () => {
        const EXPECTED_PP = 224.697; // https://osu.ppy.sh/scores/1953302746

        const score: Score = {
            accuracy: 99.18,
            mods: GameModBitwise.Hidden,
            mode: rosu.GameMode.Catch,
            combo: 1378,
            nGeki: 2946,
            nKatu: 19,
            misses: 8,
            isLazer: false,
            isScoreFailed: false,
        };

        const result = calculatorService.CalculateScorePerfomance(
            beatmap,
            score,
        );

        expect(result.pp).toBeWithin(EXPECTED_PP - 0.001, EXPECTED_PP + 0.001);
    });

    it('Should calculate score pp: mania', async () => {
        const EXPECTED_PP = 152.199; // https://osu.ppy.sh/scores/4111918025

        const score: Score = {
            accuracy: 99.06,
            mods: GameModBitwise.DoubleTime,
            mode: rosu.GameMode.Mania,
            combo: 2345,
            n300: 1004,
            nGeki: 62,
            n100: 0,
            nKatu: 62,
            n50: 2,
            misses: 4,
            isLazer: false,
            isScoreFailed: false,
        };

        const result = calculatorService.CalculateScorePerfomance(
            beatmap,
            score,
        );

        expect(result.pp).toBeWithin(EXPECTED_PP - 0.001, EXPECTED_PP + 0.001);
    });
});
