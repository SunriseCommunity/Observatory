import { startBackgroundJob } from "@observatory/common/lifecycle/background-job";

import { StorageService } from "./service/storage.service";

const CLEANUP_INTERVAL_MS = 1000 * 60 * 30;

export function startStorageCron() {
  return [
    startBackgroundJob({
      name: "StorageService: clearOldFiles",
      intervalMs: CLEANUP_INTERVAL_MS,
      run: () => StorageService.clearOldFiles(),
    }),
    startBackgroundJob({
      name: "StorageService: clearOldBeatmapsets",
      intervalMs: CLEANUP_INTERVAL_MS,
      run: () => StorageService.clearOldBeatmapsets(),
    }),
  ];
}
