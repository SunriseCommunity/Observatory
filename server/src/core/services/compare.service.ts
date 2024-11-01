import { BenchmarkResult } from '../../types/benchmark';
import { MirrorClient } from '../../types/manager';
import logger from '../../utils/logger';
import { ClientAbilities } from '../abstracts/client/base-client.types';

export class CompareService {
    private readonly beatmapSetId: number = 1357624;

    async benchmarkMirror(mirror: MirrorClient): Promise<BenchmarkResult> {
        const downloadBenchmark = await this.latencyBenchmark(mirror);

        return downloadBenchmark;
    }

    private async latencyBenchmark(
        mirror: MirrorClient,
    ): Promise<BenchmarkResult> {
        let start = performance.now();
        const client = mirror.client;

        const beatmapSet = await client.getBeatmapSet({
            beatmapSetId: this.beatmapSetId,
        });

        if (!beatmapSet) {
            this.log(
                `Failed to fetch beatmap set ${this.beatmapSetId} from ${client.clientConfig.baseUrl}`,
                'error',
            );
        }

        const latency = Math.round(performance.now() - start);

        if (
            !client.clientConfig.abilities.includes(
                ClientAbilities.DownloadBeatmapSet,
            )
        ) {
            return { latency };
        }

        start = performance.now();

        const downloadResult = await client.downloadBeatmapSet({
            beatmapSetId: this.beatmapSetId,
        });

        if (!downloadResult) {
            this.log(
                `Failed to download beatmap set ${this.beatmapSetId} from ${client.clientConfig.baseUrl}`,
                'error',
            );
            return { latency };
        }

        const downloadResultSize = downloadResult.result?.byteLength || 0;

        const downloadSpeed = Math.round(
            downloadResultSize / 1024 / ((performance.now() - start) / 1000),
        ); // KB/s

        return {
            latency,
            downloadSpeed,
        };
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`CompareService: ${message}`);
    }
}
