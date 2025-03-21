import { HttpStatusCode } from 'axios';
import { BeatmapsManagerInstance } from '../../../plugins/beatmapManager';
import { BeatmapsManager } from '../beatmaps/beatmaps.manager';
import { CalculatorService } from './calculator.service';
import { Score, ScoreShort } from './calculator.types';
import { Beatmap } from '@richardscull/rosu-pp-js';

export class CalculatorManager {
    private readonly calculatorService: CalculatorService;
    private readonly beatmapsManager: BeatmapsManager;

    constructor() {
        this.calculatorService = new CalculatorService();
        this.beatmapsManager = BeatmapsManagerInstance;
    }

    public async CalculateBeatmapPerformances(
        beatmapId: number,
        scores: ScoreShort[],
    ) {
        const beatmap = await this.GetBeatmapHash(beatmapId);
        if (beatmap instanceof Beatmap === false) {
            return beatmap;
        }

        const results = this.calculatorService.CalculateBeatmapPerfomance(
            beatmap,
            scores,
        );

        beatmap.free();

        return results;
    }

    public async CalculateScorePerformance(
        beatmapId: number,
        score: Score,
        beatmapHash?: string,
    ) {
        const beatmap = await this.GetBeatmapHash(beatmapId, beatmapHash);
        if (beatmap instanceof Beatmap === false) {
            return beatmap;
        }

        const result = this.calculatorService.CalculateScorePerfomance(
            beatmap,
            score,
        );

        beatmap.free();

        return result;
    }

    private async GetBeatmapHash(beatmapId: number, beatmapHash?: string) {
        const beatmapBuffer = await this.beatmapsManager.downloadOsuBeatmap({
            beatmapId,
        });

        if ('data' in beatmapBuffer) {
            return beatmapBuffer;
        }

        if (beatmapHash) {
            const fileHash =
                this.calculatorService.GetHashOfOsuFile(beatmapBuffer);

            if (fileHash != beatmapHash) {
                return {
                    data: null,
                    status: HttpStatusCode.NotFound,
                    message: 'Osu file with provided beatmap hash not found',
                };
            }
        }

        const beatmap =
            this.calculatorService.ConvertBufferToBeatmap(beatmapBuffer);

        return beatmap;
    }
}
