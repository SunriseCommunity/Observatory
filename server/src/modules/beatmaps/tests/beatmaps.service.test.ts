import type { MirrorsService } from "@observatory/mirrors";
import type { StorageService } from "@observatory/storage";
import { describe, expect, it, mock } from "bun:test";

import { beatmapsController } from "../beatmaps.controller";
import { BeatmapsService } from "../service/beatmaps.service";

describe("BeatmapsService", () => {
  it("returns an independent error body per failed request", async () => {
    const statuses = [503, 502];
    const storage = { getBeatmap: mock(async () => {}) } as unknown as StorageService;
    const mirrors = {
      getBeatmap: mock(async () => ({ result: null, status: statuses.shift()! })),
    } as unknown as MirrorsService;

    const service = new BeatmapsService(storage, mirrors);

    const first = await service.getBeatmap({ beatmapId: 1 });
    const second = await service.getBeatmap({ beatmapId: 2 });

    expect(first.status).toBe(503);
    expect(second.status).toBe(502);
    expect(first).not.toBe(second);
  });
});

describe("GET /api/v2/search", () => {
  it.each(["0", "101", "500"])("rejects limit=%s with 422", async (limit) => {
    const response = await beatmapsController.handle(new Request(`http://localhost/api/v2/search?limit=${limit}`));

    expect(response.status).toBe(422);
  });
});
