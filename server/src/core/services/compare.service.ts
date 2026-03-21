import type { BenchmarkResult } from "../../types/benchmark";
import logger from "../../utils/logger";
import type {
  MirrorClient,
} from "../abstracts/client/base-client.types";
import {
  ClientAbilities,
} from "../abstracts/client/base-client.types";

export class CompareService {
  private readonly beatmapSetId: number = 1357624;
  private readonly beatmapId: number = 1003401;

  async benchmarkMirror(mirror: MirrorClient): Promise<BenchmarkResult> {
    const downloadBenchmark = await this.latencyBenchmark(mirror);

    return downloadBenchmark;
  }

  abilitiesToBenchmark(mirror: MirrorClient) {
    const apiAbilities = new Set([ClientAbilities.GetBeatmapSetById]); // Basic minimum average client should have
    const downloadAbilities = new Set([
      ClientAbilities.DownloadBeatmapSetByIdNoVideo,
      ClientAbilities.DownloadBeatmapSetById,
      ClientAbilities.DownloadOsuBeatmap,
    ]);

    return {
      download: mirror.client.clientConfig.abilities.some(ability =>
        downloadAbilities.has(ability),
      ),
      api: mirror.client.clientConfig.abilities.some(ability =>
        apiAbilities.has(ability),
      ),
    };
  }

  private async latencyBenchmark(
    mirror: MirrorClient,
  ): Promise<BenchmarkResult> {
    let start = performance.now();
    const { client } = mirror;

    const results = {
      latency: undefined,
      downloadSpeed: undefined,
    } as BenchmarkResult;

    const toBenchmark = this.abilitiesToBenchmark(mirror);

    if (toBenchmark.api) {
      const beatmapSet = await client.getBeatmapSet({
        beatmapSetId: this.beatmapSetId,
      });

      if (!beatmapSet.result) {
        this.log(
                    `Failed to fetch beatmap set ${this.beatmapSetId} from ${client.clientConfig.baseUrl}`,
                    "error",
        );
      }

      results.latency = Math.round(performance.now() - start);
    }

    if (toBenchmark.download) {
      start = performance.now();

      const downloadOsuBeatmap = client.clientConfig.abilities.includes(
        ClientAbilities.DownloadOsuBeatmap,
      );

      let downloadResult: { result: ArrayBuffer | null } = {
        result: null,
      };

      if (downloadOsuBeatmap) {
        downloadResult = await client.downloadOsuBeatmap({
          beatmapId: this.beatmapId,
        });

        if (!downloadResult) {
          this.log(
                        `Failed to download .osu beatmap from ${client.clientConfig.baseUrl}`,
                        "error",
          );

          return results;
        }
      }
      else {
        const downloadWithoutVideo
          = client.clientConfig.abilities.includes(
            ClientAbilities.DownloadBeatmapSetByIdNoVideo,
          );

        downloadResult = await client.downloadBeatmapSet({
          beatmapSetId: this.beatmapSetId,
          noVideo: downloadWithoutVideo ? true : false,
        });

        if (!downloadResult) {
          this.log(
                        `Failed to download beatmap set ${this.beatmapSetId} from ${client.clientConfig.baseUrl}`,
                        "error",
          );

          return results;
        }
      }

      const downloadResultSize = downloadResult.result?.byteLength || 0;
      const downloadSpeed = Math.round(
        downloadResultSize
        / 1024
        / ((performance.now() - start) / 1000),
      ); // KB/s

      results.downloadSpeed = downloadSpeed;
    }

    return results;
  }

  private log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`CompareService: ${message}`);
  }
}
