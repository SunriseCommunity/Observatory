import { rename, rm } from "node:fs/promises";

import { getDirectoryStats } from "@observatory/common/utilities/stats";

const DATA_PATH = "data";

export abstract class StorageFilesRepository {
  static getFilePath(fileName: string) {
    return `${DATA_PATH}/${fileName}`;
  }

  static async readFile(path: string): Promise<ArrayBuffer> {
    return await Bun.file(path).arrayBuffer();
  }

  static async isFileExists(path: string) {
    return await Bun.file(path).exists();
  }

  static async saveFile(
    file: ArrayBuffer,
    fileName: string,
  ): Promise<string> {
    const path = StorageFilesRepository.getFilePath(fileName);
    await Bun.write(path, file);
    return path;
  }

  static async removeFile(path: string) {
    await rm(path, { force: true });
  }

  static async renameFile(from: string, to: string) {
    await rename(from, to);
  }

  static async getDirectoryStats() {
    return await getDirectoryStats(DATA_PATH);
  }
}
