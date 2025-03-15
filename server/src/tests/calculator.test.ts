import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'bun:test';

import * as rosu from 'rosu-pp-js';
import { CalculatorService } from '../core/services/calculator.service';
import { GameModBitwise } from '../types/general/gameMod';

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
        const beatmapMode =
            calculatorService.TryConvertToGamemode(3) ?? beatmap.mode;

        expect(beatmapMode).toBe(rosu.GameMode.Mania);
    });

    it('Invalid beatmap mode should be defaulted to std', async () => {
        const beatmapMode =
            calculatorService.TryConvertToGamemode(5) ?? beatmap.mode;

        expect(beatmapMode).toBe(rosu.GameMode.Osu);
    });

    it('Should calculate multiple acc values', async () => {
        const accuracies = [100, 99, 98, 95];

        const results = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            accuracies,
            beatmap.mode,
        );

        expect(results.length).toBe(accuracies.length);
    });

    it('Should apply DT mod', async () => {
        const perfomanceWithoutMod =
            calculatorService.CalculateBeatmapPerfomance(
                beatmap,
                [100],
                beatmap.mode,
            );

        const perfomanceWithMod = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            [100],
            beatmap.mode,
            GameModBitwise.DoubleTime,
        );

        expect(perfomanceWithMod[0].difficulty.stars).toBeGreaterThan(
            perfomanceWithoutMod[0].difficulty.stars,
        );
    });

    it('Should convert beatmap to another gamemode', async () => {
        const perfomanceStandard = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            [100],
            beatmap.mode,
        );

        const perfomanceTaiko = calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            [100],
            rosu.GameMode.Taiko,
        );

        expect(perfomanceTaiko[0].difficulty.isConvert).toBe(true);
        expect(perfomanceStandard[0].difficulty.stars).not.toEqual(
            perfomanceTaiko[0].difficulty.stars,
        );
    });

    it('Should calculate score pp', async () => {
        const EXPECTED_PP = 311.464; // https://osu.ppy.sh/scores/4502844247

        const result = calculatorService.CalculateScorePerfomance(
            beatmap,
            97.13,
            beatmap.mode,
            GameModBitwise.DoubleTime,
            956,
            1869,
            0,
            34,
            0,
            1,
            32,
        );

        expect(result.pp).toBeWithin(EXPECTED_PP - 0.1, EXPECTED_PP + 0.1);
    });
});
