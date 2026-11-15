import { startBackgroundJob } from "@observatory/common/lifecycle/background-job";

import { mirrorsService } from ".";

const BENCHMARK_INTERVAL_MS = 1000 * 60 * 10;

export function startMirrorsCron() {
  return startBackgroundJob({
    name: "MirrorsManager: fetchMirrorsData",
    intervalMs: BENCHMARK_INTERVAL_MS,
    run: () => mirrorsService.fetchMirrorsData(),
  });
}
