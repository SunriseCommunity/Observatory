import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';
import { CalculatorServicePlugin } from '../../plugins/calculatorService';
import { ServerResponse } from '../../core/managers/beatmaps/beatmaps-manager.types';
import { HttpStatusCode } from 'axios';
import { GameModBitwise } from '../../types/general/gameMod';

export default (app: App) => {
    app.use(BeatmapsManagerPlugin)
        .use(CalculatorServicePlugin)
        .get(
            '/beatmap/:id',
            async ({
                BeatmapsManagerInstance,
                CalculatorServiceInstance,
                params: { id },
                query: { acc, mode, mods, combo, misses },
            }) => {
                const beatmapBuffer =
                    await BeatmapsManagerInstance.downloadOsuBeatmap({
                        beatmapId: id,
                    });

                if ('data' in beatmapBuffer) {
                    return beatmapBuffer;
                }

                const beatmap =
                    CalculatorServiceInstance.ConvertBufferToBeatmap(
                        beatmapBuffer,
                    );

                const beatmapMode = mode
                    ? CalculatorServiceInstance.TryConvertToGamemode(mode)
                    : undefined;

                const results =
                    CalculatorServiceInstance.CalculateBeatmapPerfomance(
                        beatmap,
                        acc,
                        beatmapMode ?? beatmap.mode,
                        mods,
                        combo,
                        misses,
                    );

                return results;
            },
            {
                params: t.Object({
                    id: t.Number(),
                }),
                query: t.Object({
                    acc: t.Array(t.Numeric(), { minItems: 1, maxItems: 5 }),
                    mode: t.Optional(t.Numeric()),
                    mods: t.Optional(t.Numeric()),
                    combo: t.Optional(t.Numeric()),
                    misses: t.Optional(t.Numeric()),
                }),
                tags: ['Calculators'],
            },
        )
        .post(
            '/score',
            async ({
                BeatmapsManagerInstance,
                CalculatorServiceInstance,
                body: {
                    beatmapId,
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
                },
            }) => {
                const beatmapBuffer =
                    await BeatmapsManagerInstance.downloadOsuBeatmap({
                        beatmapId,
                    });

                if ('data' in beatmapBuffer) {
                    return beatmapBuffer;
                }

                const beatmap =
                    CalculatorServiceInstance.ConvertBufferToBeatmap(
                        beatmapBuffer,
                    );

                const beatmapMode = mode
                    ? CalculatorServiceInstance.TryConvertToGamemode(mode)
                    : undefined;

                const result =
                    CalculatorServiceInstance.CalculateScorePerfomance(
                        beatmap,
                        acc,
                        beatmapMode ?? beatmap.mode,
                        mods ?? GameModBitwise.NoMod,
                        combo,
                        n300,
                        nGeki,
                        n100,
                        nKatu,
                        n50,
                        misses,
                    );

                return result;
            },
            {
                body: t.Object({
                    beatmapId: t.Numeric(),
                    acc: t.Numeric(),
                    combo: t.Numeric(),
                    n300: t.Numeric(),
                    nGeki: t.Numeric(),
                    n100: t.Numeric(),
                    nKatu: t.Numeric(),
                    n50: t.Numeric(),
                    misses: t.Numeric(),
                    mode: t.Optional(t.Numeric()),
                    mods: t.Optional(t.Numeric()),
                }),
                tags: ['Calculators'],
            },
        );

    return app;
};
