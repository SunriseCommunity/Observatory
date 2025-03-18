import { t } from 'elysia';
import { App } from '../../app';
import { BeatmapsManagerPlugin } from '../../plugins/beatmapManager';
import { CalculatorServicePlugin } from '../../plugins/calculatorService';
import { GameModBitwise } from '../../types/general/gameMod';
import { HttpStatusCode } from 'axios';

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

                const beatmapMode =
                    CalculatorServiceInstance.TryConvertToGamemode(mode) ??
                    beatmap.mode;

                const results =
                    CalculatorServiceInstance.CalculateBeatmapPerfomance(
                        beatmap,
                        acc ?? [100],
                        beatmapMode,
                        mods ?? GameModBitwise.NoMod,
                        combo,
                        misses,
                    );

                beatmap.free();

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
                },
            }) => {
                const beatmapBuffer =
                    await BeatmapsManagerInstance.downloadOsuBeatmap({
                        beatmapId,
                    });

                if ('data' in beatmapBuffer) {
                    return beatmapBuffer;
                }

                if (beatmapHash) {
                    const fileHash =
                        CalculatorServiceInstance.GetHashOfOsuFile(
                            beatmapBuffer,
                        );

                    if (fileHash != beatmapHash) {
                        return {
                            data: null,
                            status: HttpStatusCode.NotFound,
                            message:
                                'Osu file with provided beatmap hash not found',
                        };
                    }
                }

                const beatmap =
                    CalculatorServiceInstance.ConvertBufferToBeatmap(
                        beatmapBuffer,
                    );

                const beatmapMode =
                    CalculatorServiceInstance.TryConvertToGamemode(mode) ??
                    beatmap.mode;

                const result =
                    CalculatorServiceInstance.CalculateScorePerfomance(
                        beatmap,
                        acc,
                        beatmapMode,
                        mods ?? GameModBitwise.NoMod,
                        combo,
                        n300,
                        nGeki,
                        n100,
                        nKatu,
                        n50,
                        misses,
                        isScoreFailed,
                    );

                beatmap.free();

                return result;
            },
            {
                body: t.Object({
                    beatmapId: t.Numeric(),
                    beatmapHash: t.Optional(t.String()),
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
                    isScoreFailed: t.Optional(t.Boolean()),
                }),
                tags: ['Calculators'],
            },
        );

    return app;
};
