import { rename, rm } from "node:fs/promises";

import config from "@observatory/common/config";
import logger from "@observatory/common/observability/logger";
import type { DownloadBeatmapSetOptions, DownloadOsuBeatmap } from "@observatory/common/types/beatmap-query";
import {
  bytesToHumanReadableMegabytes,
  getDirectoryStats,
} from "@observatory/common/utilities/stats";
import AdmZip from "adm-zip";

import {
  createBeatmapOsuFile,
  deleteBeatmapsOsuFiles,
  getBeatmapOsuFile,
  getUnvalidBeatmapOsuFiles,
} from "../repository/beatmap-osu-file.repository";
import {
  createBeatmapsetFile,
  deleteBeatmapsetsFiles,
  getBeatmapSetFile,
  getUnvalidBeatmapSetsFiles,
} from "../repository/beatmapset-file.repository";
import type { StorageCacheService } from "./storage-cache.service";

const CLEANUP_BATCH_SIZE = 1000;

export class StorageFilesService {
  private readonly dataPath = "data";
  private readonly videoFormats = ["avi", "flv", "mp4", "m4v"];

  private readonly cacheService: StorageCacheService;

  constructor(cacheService: StorageCacheService) {
    this.cacheService = cacheService;

    this.log("Initialized");
  }

  async insertBeatmapsetFile(
    file: ArrayBuffer | null,
    ctx: DownloadBeatmapSetOptions,
  ) {
    if (!file) {
      await this.cacheService.insertEmptyBeatmapsetFile(ctx);
      return;
    }

    const path = await this.saveFile(
      file,
            `${ctx.beatmapSetId}${ctx.noVideo ? "n" : ""}.osz`,
    );

    if (ctx.noVideo !== true) {
      await rm(`${this.dataPath}/${ctx.beatmapSetId}n.osz`, { force: true });
    }

    const beatmapsetFile = await createBeatmapsetFile({
      id: ctx.beatmapSetId,
      noVideo: ctx.noVideo || false,
      path,
      validUntil: new Date(
        Date.now() + 1000 * 60 * 60 * config.OSZ_FILES_LIFE_SPAN,
      ).toISOString(),
    });

    await this.cacheService.insertBeatmapsetFile(ctx, beatmapsetFile);
  }

  async insertBeatmapOsuFile(
    file: ArrayBuffer | null,
    ctx: DownloadOsuBeatmap,
  ) {
    if (!file) {
      await this.cacheService.insertEmptyBeatmapOsuFile(ctx);
      return;
    }

    const path = await this.saveFile(file, `${ctx.beatmapId}.osu`);

    const beatmapOsuFile = await createBeatmapOsuFile({
      id: ctx.beatmapId,
      path,
      validUntil: new Date(
        Date.now() + 1000 * 60 * 60 * config.OSZ_FILES_LIFE_SPAN, // Same as .osz files
      ).toISOString(),
    });

    await this.cacheService.insertBeatmapOsuFile(ctx, beatmapOsuFile);
  }

  async getOsuBeatmapFile(
    ctx: DownloadOsuBeatmap,
  ): Promise<ArrayBuffer | undefined | null> {
    let data = await this.cacheService.getBeatmapOsuFile(ctx);

    if (data === null) {
      return null;
    }

    if (data === undefined) {
      data = await getBeatmapOsuFile(ctx);

      if (!data) {
        return undefined;
      }

      await this.cacheService.insertBeatmapOsuFile(ctx, data);
    }

    if (!(await this.isFileExists(data.path))) {
      return undefined;
    }

    return this.readFile(data.path);
  }

  async getBeatmapsetFile(
    ctx: DownloadBeatmapSetOptions,
  ): Promise<ArrayBuffer | undefined | null> {
    let data = await this.cacheService.getBeatmapSetFile(ctx);

    if (data === null) {
      return null;
    }

    if (data === undefined) {
      data = await getBeatmapSetFile(ctx);

      if (!data) {
        return undefined;
      }

      await this.cacheService.insertBeatmapsetFile(ctx, data);
    }

    // Return if the file is marked as no video,
    // which we can't serve to request with noVideo set to false (or undefined)
    if (ctx.noVideo !== true && data.noVideo) {
      return undefined;
    }

    if (!(await this.isFileExists(data.path))) {
      return undefined;
    }

    return this.getZippedFile(data.path, { noVideo: ctx.noVideo || false });
  }

  public async getStorageFilesStats() {
    const directoryStats = await getDirectoryStats(this.dataPath);

    return {
      totalFiles: directoryStats.fileCount,
      totalBytes: bytesToHumanReadableMegabytes(directoryStats.totalSize),
    };
  }

  private async getZippedFile(path: string, ctx: { noVideo: boolean }) {
    if (
      (path.endsWith("n.osz") && ctx.noVideo)
      || (!path.endsWith("n.osz") && !ctx.noVideo)
    ) {
      return this.readFile(path);
    }

    const noVideoPath = this.getNoVideoPath(path);

    if (await this.isFileExists(noVideoPath)) {
      return this.readFile(noVideoPath);
    }

    const shadowCopyPath = `${path}.${crypto.randomUUID()}.temp`;

    const osz = new AdmZip(path);
    const files = osz.getEntries();

    for (const file of files) {
      const isVideo = this.videoFormats.some(format =>
        file.entryName.endsWith(format),
      );

      if (isVideo) {
        osz.deleteFile(file);
      }
    }

    osz.writeZip(shadowCopyPath);
    await rename(shadowCopyPath, noVideoPath);

    return this.readFile(noVideoPath);
  }

  private getNoVideoPath(path: string) {
    return path.replace(/\.osz$/, "n.osz");
  }

  private async readFile(path: string): Promise<ArrayBuffer> {
    return await Bun.file(path).arrayBuffer();
  }

  private async isFileExists(path: string) {
    return await Bun.file(path).exists();
  }

  private async saveFile(
    file: ArrayBuffer,
    fileName: string,
  ): Promise<string> {
    const path = `${this.dataPath}/${fileName}`;
    await Bun.write(path, file);
    return path;
  }

  async clearOldFiles() {
    let removed = 0;

    while (true) {
      const beatmapsetsForRemoval = await getUnvalidBeatmapSetsFiles(CLEANUP_BATCH_SIZE);
      const osuBeatmapsForRemoval = await getUnvalidBeatmapOsuFiles(CLEANUP_BATCH_SIZE);

      const forRemoval = [...beatmapsetsForRemoval, ...osuBeatmapsForRemoval];

      if (forRemoval.length === 0) {
        break;
      }

      for (const file of forRemoval) {
        this.log(`Removing "${file.path}" ...`, "warn");

        await rm(file.path, { force: true });

        if (file.path.endsWith(".osz") && !file.path.endsWith("n.osz")) {
          await rm(this.getNoVideoPath(file.path), { force: true });
        }
      }

      await deleteBeatmapsetsFiles(beatmapsetsForRemoval.map(file => file.id));
      await deleteBeatmapsOsuFiles(osuBeatmapsForRemoval.map(file => file.id));

      removed += forRemoval.length;
    }

    if (removed === 0) {
      this.log("Nothing to remove. Skip cleaning.");
      return;
    }

    this.log(`Cleaning is finished! Removed ${removed} files`);
  }

  private log(message: string, level: "info" | "warn" | "error" = "info") {
    logger[level](`StorageFilesSerivce: ${message}`);
  }
}
