import logger from "@observatory/common/observability/logger";

import type { MirrorClient } from "../clients/base-client.types";
import { RequestsRepository } from "../repository/requests.repository";
import { abilitiesToBenchmark, benchmarkMirror } from "./compare.helper";

export abstract class MirrorsBenchmarkHelper {
  static async updateWeights(clients: MirrorClient[]): Promise<void> {
    for (const client of clients) {
      const benchmark = await MirrorsBenchmarkHelper.getMirrorBenchmark(client);

      client.weights = {
        API: MirrorsBenchmarkHelper.exponentialDecrease(benchmark.latency || Infinity),
        download: MirrorsBenchmarkHelper.exponentialIncrease(benchmark.downloadSpeed || 0),
        failrate: benchmark.failrate,
      };

      logger.info({
        mirror: client.client.mirror,
        latency_ms: benchmark.latency,
        download_speed_kbps: benchmark.downloadSpeed,
        weights: client.weights,
      }, "Mirror weights updated");
    }
  }

  private static async getMirrorBenchmark(client: MirrorClient) {
    const { baseUrl } = client.client.clientConfig;
    const stats = await RequestsRepository.getBenchmark(baseUrl, 3);
    const failrate = stats.failed / stats.total || 0;

    const toBenchmark = abilitiesToBenchmark(client);

    if (
      (toBenchmark.api && stats.apiRequests === 0)
      || (toBenchmark.download && stats.downloadRequests === 0)
    ) {
      logger.warn({ mirror: client.client.mirror }, "Not enough recent requests to benchmark the mirror, fetching new data");

      return {
        ...await benchmarkMirror(client),
        failrate,
      };
    }

    return {
      latency: stats.averageLatency ?? undefined,
      downloadSpeed: stats.averageDownloadSpeed ?? undefined,
      failrate,
    };
  }

  private static exponentialDecrease(x: number): number {
    return 10000 * Math.exp((-1 / 10000) * x);
  }

  private static exponentialIncrease(x: number): number {
    return 10000 * (1 - Math.exp((-1 / 10000) * x));
  }
}
