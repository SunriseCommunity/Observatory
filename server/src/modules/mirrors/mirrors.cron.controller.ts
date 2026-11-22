import { startBackgroundJob } from "@observatory/common/lifecycle/background-job";

import { MirrorsService } from "./service/mirrors.service";

const BENCHMARK_INTERVAL_MS = 1000 * 60 * 10;

export function startMirrorsCron() {
  return startBackgroundJob({
    name: "MirrorsService: fetchMirrorsData",
    intervalMs: BENCHMARK_INTERVAL_MS,
    run: () => MirrorsService.fetchMirrorsData(),
  });
}
