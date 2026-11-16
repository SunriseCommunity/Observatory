import logger from "@observatory/common/observability/logger";

import type { MirrorClient } from "../clients/base-client.types";
import { ClientAbilities } from "../clients/base-client.types";
import type { BenchmarkResult } from "../model/benchmark.model";

const BENCHMARK_BEATMAPSET_ID = 1357624;
const BENCHMARK_BEATMAP_ID = 1003401;

const API_ABILITIES = new Set([ClientAbilities.GetBeatmapSetById]); // Basic minimum average client should have
const DOWNLOAD_ABILITIES = new Set([
  ClientAbilities.DownloadBeatmapSetByIdNoVideo,
  ClientAbilities.DownloadBeatmapSetById,
  ClientAbilities.DownloadOsuBeatmap,
]);

export function abilitiesToBenchmark(mirror: MirrorClient) {
  const { abilities } = mirror.client.clientConfig;

  return {
    download: abilities.some(ability => DOWNLOAD_ABILITIES.has(ability)),
    api: abilities.some(ability => API_ABILITIES.has(ability)),
  };
}

export async function benchmarkMirror(mirror: MirrorClient): Promise<BenchmarkResult> {
  const { client } = mirror;
  const results: BenchmarkResult = {
    latency: undefined,
    downloadSpeed: undefined,
  };

  const toBenchmark = abilitiesToBenchmark(mirror);

  if (toBenchmark.api) {
    const start = performance.now();
    const beatmapSet = await client.getBeatmapSet({
      beatmapSetId: BENCHMARK_BEATMAPSET_ID,
    });

    if (!beatmapSet.result) {
      logger.error({ mirror: client.mirror, status: beatmapSet.status }, `Benchmark failed to fetch beatmapset ${BENCHMARK_BEATMAPSET_ID}`);
    }

    results.latency = Math.round(performance.now() - start);
  }

  if (toBenchmark.download) {
    const start = performance.now();
    const { abilities } = client.clientConfig;

    const downloadResult = abilities.includes(ClientAbilities.DownloadOsuBeatmap)
      ? await client.downloadOsuBeatmap({ beatmapId: BENCHMARK_BEATMAP_ID })
      : await client.downloadBeatmapSet({
          beatmapSetId: BENCHMARK_BEATMAPSET_ID,
          noVideo: abilities.includes(ClientAbilities.DownloadBeatmapSetByIdNoVideo),
        });

    results.downloadSpeed = Math.round(
      (downloadResult.result?.byteLength || 0) / 1024 / ((performance.now() - start) / 1000),
    ); // KB/s
  }

  return results;
}
