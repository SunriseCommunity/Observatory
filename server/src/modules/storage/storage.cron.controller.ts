import { startBackgroundJob } from "@observatory/common/lifecycle/background-job";

import { storageService } from ".";

const CLEANUP_INTERVAL_MS = 1000 * 60 * 30;

export function startStorageCron() {
  return [
    startBackgroundJob({
      name: "StorageFilesService: clearOldFiles",
      intervalMs: CLEANUP_INTERVAL_MS,
      run: () => storageService.clearOldFiles(),
    }),
    startBackgroundJob({
      name: "StorageManager: clearOldBeatmapsets",
      intervalMs: CLEANUP_INTERVAL_MS,
      run: () => storageService.clearOldBeatmapsets(),
    }),
  ];
}
