import { t } from 'elysia';
import { App } from '../../app';
import { CalculatorManagerPlugin } from '../../plugins/calculatorManager';
import {
    Score,
    ScoreShort,
} from '../../core/managers/calculator/calculator.types';
import { TryConvertToGamemode } from '../../utils/beatmap';

export default (app: App) => {
    app.use(CalculatorManagerPlugin)
        .get(
            '/beatmap/:id',
            async ({
                CalculatorManagerInstance,
                params: { id },
                query: {
                    acc,
                    mode,
                    mods,
                    combo,
                    misses,
                    isScoreFailed,
                    isPlayedOnLazer,
                },
            }) => {
                const scores: ScoreShort[] = [];
                const beatmapMode = TryConvertToGamemode(mode);

                for (let accuracy of acc ?? [100]) {
                    scores.push({
                        accuracy,
                        mode: beatmapMode,
                        mods: mods,
                        combo,
                        misses,
                        isScoreFailed: isScoreFailed ?? false,
                        isLazer: isPlayedOnLazer ?? false,
                    });
                }

                const results =
                    await CalculatorManagerInstance.CalculateBeatmapPerformances(
                        id,
                        scores,
                    );

                return results;
            },
            {
                params: t.Object({
                    id: t.Number(),
                }),
                query: t.Object({
                    acc: t.Optional(
                        t.Array(t.Numeric(), { minItems: 1, maxItems: 5 }),
                    ),
                    mode: t.Optional(t.Numeric()),
                    mods: t.Optional(t.Numeric()),
                    combo: t.Optional(t.Numeric()),
                    misses: t.Optional(t.Numeric()),
                    isScoreFailed: t.Optional(t.BooleanString()),
                    isPlayedOnLazer: t.Optional(t.BooleanString()),
                }),
                tags: ['Calculators'],
            },
        )
        .post(
            '/score',
            async ({
                CalculatorManagerInstance,
                body: {
                    beatmapId,
                    beatmapHash,
                    mode,
                    acc,
                    mods,
                    combo,
                    n300,
                    nGeki,
                    n100,
                    nKatu,
                    n50,
                    misses,
                    isScoreFailed,
                    isPlayedOnLazer,
                },
            }) => {
                const beatmapMode = TryConvertToGamemode(mode);

                const score: Score = {
                    accuracy: acc,
                    mode: beatmapMode,
                    mods: mods,
                    n300: n300,
                    nGeki: nGeki,
                    n100: n100,
                    nKatu: nKatu,
                    n50: n50,
                    combo,
                    misses,
                    isScoreFailed: isScoreFailed ?? false,
                    isLazer: isPlayedOnLazer ?? false,
                };

                const results =
                    await CalculatorManagerInstance.CalculateScorePerformance(
                        beatmapId,
                        score,
                        beatmapHash,
                    );

                return results;
            },
            {
                body: t.Object({
                    beatmapId: t.Numeric(),
                    beatmapHash: t.Optional(t.String()),
                    acc: t.Optional(t.Numeric()),
                    combo: t.Optional(t.Numeric()),
                    n300: t.Optional(t.Numeric()),
                    nGeki: t.Optional(t.Numeric()),
                    n100: t.Optional(t.Numeric()),
                    nKatu: t.Optional(t.Numeric()),
                    n50: t.Optional(t.Numeric()),
                    misses: t.Optional(t.Numeric()),
                    mode: t.Optional(t.Numeric()),
                    mods: t.Optional(t.Numeric()),
                    isScoreFailed: t.Optional(t.Boolean()),
                    isPlayedOnLazer: t.Optional(t.Boolean()),
                }),
                tags: ['Calculators'],
            },
        );

    return app;
};
