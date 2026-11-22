import config from "@observatory/common/config";
import logger from "@observatory/common/observability/logger";

import { StorageFilesHelper } from "../helper/storage-files.helper";
import { BeatmapOsuFileRepository } from "../repository/beatmap-osu-file.repository";
import { BeatmapsetRepository } from "../repository/beatmapset.repository";
import { BeatmapsetFileRepository } from "../repository/beatmapset-file.repository";
import { StorageFilesRepository } from "../repository/storage-files.repository";

const CLEANUP_BATCH_SIZE = 1000;

export abstract class StorageService {
  static async clearOldFiles() {
    let removed = 0;

    while (true) {
      const beatmapsetsForRemoval = await BeatmapsetFileRepository.getUnvalid(CLEANUP_BATCH_SIZE);
      const osuBeatmapsForRemoval = await BeatmapOsuFileRepository.getUnvalid(CLEANUP_BATCH_SIZE);

      const forRemoval = [...beatmapsetsForRemoval, ...osuBeatmapsForRemoval];

      if (forRemoval.length === 0) {
        break;
      }

      for (const file of forRemoval) {
        StorageService.log(`Removing "${file.path}" ...`, "warn");

        await StorageFilesRepository.removeFile(file.path);

        if (file.path.endsWith(".osz") && !file.path.endsWith("n.osz")) {
          await StorageFilesRepository.removeFile(StorageFilesHelper.getNoVideoPath(file.path));
        }
      }

      await BeatmapsetFileRepository.deleteMany(beatmapsetsForRemoval.map(file => file.id));
      await BeatmapOsuFileRepository.deleteMany(osuBeatmapsForRemoval.map(file => file.id));

      removed += forRemoval.length;
    }

    if (removed === 0) {
      StorageService.log("Nothing to remove. Skip cleaning.");
      return;
    }

    StorageService.log(`Cleaning is finished! Removed ${removed} files`);
  }

  static async clearOldBeatmapsets() {
    if (!config.EnableCronToClearOutdatedBeatmaps) {
      return;
    }

    const removed = await BeatmapsetRepository.deleteUnvalid();

    this.log(`Cleaning unvalid beatmaps is finished! Removed ${removed} beatmapsets`);
  }

  private static log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`StorageService: ${message}`);
  }
}
