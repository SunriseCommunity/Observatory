import { BeatmapsHelper } from "@observatory/beatmaps";
import config, { observatoryConfigPublic } from "@observatory/common/config";
import { formatNanoseconds, humanReadableMemory } from "@observatory/common/utilities/stats";

export abstract class StatsService {
  static async getStats() {
    const serverStats = StatsService.getServerStatistics();
    const managerStats
      = await BeatmapsHelper.getManagerStats(config.ShowInternalValuesInPublicStatsEndpoint);
    const serverConfig = observatoryConfigPublic;

    return {
      config: config.ShowInternalValuesInPublicStatsEndpoint ? serverConfig : undefined,
      server: serverStats,
      manager: managerStats,
    };
  }

  private static getServerStatistics() {
    const uptimeNanoseconds = Bun.nanoseconds();
    const memory = process.memoryUsage();

    return {
      uptime: {
        nanoseconds: uptimeNanoseconds,
        pretty: formatNanoseconds(uptimeNanoseconds),
      },
      memory: humanReadableMemory(memory),
      pid: process.pid,
      version: Bun.version,
      revision: Bun.revision,
    };
  }
}
