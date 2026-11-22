import config from "@observatory/common/config";
import logger from "@observatory/common/observability/logger";
import type { DownloadBeatmapSetOptions, DownloadOsuBeatmap } from "@observatory/common/types/beatmap-query";
import { bytesToHumanReadableMegabytes } from "@observatory/common/utilities/stats";
import AdmZip from "adm-zip";

import { BeatmapOsuFileRepository } from "../repository/beatmap-osu-file.repository";
import { BeatmapsetFileRepository } from "../repository/beatmapset-file.repository";
import { StorageCacheRepository } from "../repository/storage-cache.repository";
import { StorageFilesRepository } from "../repository/storage-files.repository";

const VIDEO_FORMATS = ["avi", "flv", "mp4", "m4v"];

export abstract class StorageFilesHelper {
  static {
    this.log("Initialized");
  }

  static async insertBeatmapsetFile(
    file: ArrayBuffer | null,
    ctx: DownloadBeatmapSetOptions,
  ) {
    if (!file) {
      await StorageCacheRepository.insertEmptyBeatmapsetFile(ctx);
      return;
    }

    const path = await StorageFilesRepository.saveFile(
      file,
            `${ctx.beatmapSetId}${ctx.noVideo ? "n" : ""}.osz`,
    );

    if (ctx.noVideo !== true) {
      await StorageFilesRepository.removeFile(StorageFilesRepository.getFilePath(`${ctx.beatmapSetId}n.osz`));
    }

    const beatmapsetFile = await BeatmapsetFileRepository.create({
      id: ctx.beatmapSetId,
      noVideo: ctx.noVideo || false,
      path,
      validUntil: new Date(
        Date.now() + 1000 * 60 * 60 * config.OSZ_FILES_LIFE_SPAN,
      ).toISOString(),
    });

    await StorageCacheRepository.insertBeatmapsetFile(ctx, beatmapsetFile);
  }

  static async insertBeatmapOsuFile(
    file: ArrayBuffer | null,
    ctx: DownloadOsuBeatmap,
  ) {
    if (!file) {
      await StorageCacheRepository.insertEmptyBeatmapOsuFile(ctx);
      return;
    }

    const path = await StorageFilesRepository.saveFile(file, `${ctx.beatmapId}.osu`);

    const beatmapOsuFile = await BeatmapOsuFileRepository.create({
      id: ctx.beatmapId,
      path,
      validUntil: new Date(
        Date.now() + 1000 * 60 * 60 * config.OSZ_FILES_LIFE_SPAN, // Same as .osz files
      ).toISOString(),
    });

    await StorageCacheRepository.insertBeatmapOsuFile(ctx, beatmapOsuFile);
  }

  static async getOsuBeatmapFile(
    ctx: DownloadOsuBeatmap,
  ): Promise<ArrayBuffer | undefined | null> {
    let data = await StorageCacheRepository.getBeatmapOsuFile(ctx);

    if (data === null) {
      return null;
    }

    if (data === undefined) {
      data = await BeatmapOsuFileRepository.get(ctx);

      if (!data) {
        return undefined;
      }

      await StorageCacheRepository.insertBeatmapOsuFile(ctx, data);
    }

    if (!(await StorageFilesRepository.isFileExists(data.path))) {
      return undefined;
    }

    return StorageFilesRepository.readFile(data.path);
  }

  static async getBeatmapsetFile(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ArrayBuffer | undefined | null> {
    let data = await StorageCacheRepository.getBeatmapSetFile(ctx);

    if (data === null) {
      return null;
    }

    if (data === undefined) {
      data = await BeatmapsetFileRepository.get(ctx);

      if (!data) {
        return undefined;
      }

      await StorageCacheRepository.insertBeatmapsetFile(ctx, data);
    }

    // Return if the file is marked as no video,
    // which we can't serve to request with noVideo set to false (or undefined)
    if (ctx.noVideo !== true && data.noVideo) {
      return undefined;
    }

    if (!(await StorageFilesRepository.isFileExists(data.path))) {
      return undefined;
    }

    return this.getZippedFile(data.path, { noVideo: ctx.noVideo || false });
  }

  public static async getStorageFilesStats() {
    const directoryStats = await StorageFilesRepository.getDirectoryStats();

    return {
      totalFiles: directoryStats.fileCount,
      totalBytes: bytesToHumanReadableMegabytes(directoryStats.totalSize),
    };
  }

  private static async getZippedFile(path: string, ctx: { noVideo: boolean }) {
    if (
      (path.endsWith("n.osz") && ctx.noVideo)
      || (!path.endsWith("n.osz") && !ctx.noVideo)
    ) {
      return StorageFilesRepository.readFile(path);
    }

    const noVideoPath = this.getNoVideoPath(path);

    if (await StorageFilesRepository.isFileExists(noVideoPath)) {
      return StorageFilesRepository.readFile(noVideoPath);
    }

    const shadowCopyPath = `${path}.${crypto.randomUUID()}.temp`;

    const osz = new AdmZip(path);
    const files = osz.getEntries();

    for (const file of files) {
      const isVideo = VIDEO_FORMATS.some(format =>
        file.entryName.endsWith(format),
      );

      if (isVideo) {
        osz.deleteFile(file);
      }
    }

    osz.writeZip(shadowCopyPath);
    await StorageFilesRepository.renameFile(shadowCopyPath, noVideoPath);

    return StorageFilesRepository.readFile(noVideoPath);
  }

  static getNoVideoPath(path: string) {
    return path.replace(/\.osz$/, "n.osz");
  }

  private static log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`StorageFilesHelper: ${message}`);
  }
}
