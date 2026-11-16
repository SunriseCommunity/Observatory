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

  it.each([true, false])("caches mirror beatmaps when allowMissingNonBeatmapValues=%p", async (allowMissingNonBeatmapValues) => {
    const storage = {
      getBeatmap: mock(async () => {}),
      insertBeatmap: mock(async () => {}),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmap: mock(async () => ({ result: { id: 1 }, status: 200 })),
    } as unknown as MirrorsService;

    const ctx = { beatmapId: 1, allowMissingNonBeatmapValues };
    await new BeatmapsService(storage, mirrors).getBeatmap(ctx);

    expect(storage.insertBeatmap).toHaveBeenCalledWith({ id: 1 }, ctx);
  });

  it("caches missing beatmaps when partial data is allowed", async () => {
    const storage = {
      getBeatmap: mock(async () => {}),
      insertBeatmap: mock(async () => {}),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmap: mock(async () => ({ result: null, status: 404 })),
    } as unknown as MirrorsService;
    const ctx = { beatmapId: 1, allowMissingNonBeatmapValues: true };

    await new BeatmapsService(storage, mirrors).getBeatmap(ctx);

    expect(storage.insertBeatmap).toHaveBeenCalledWith(null, ctx);
  });

  it("fetches each beatmapset missing from storage once in full", async () => {
    const storedSet = { id: 10, beatmaps: [{ id: 1 }] };
    const fullSet = { id: 20, beatmaps: [{ id: 2 }, { id: 3 }] };
    const storage = {
      getBeatmapSetsByBeatmapIds: mock(async () => [storedSet]),
      getBeatmapSet: mock(async () => {}),
      insertBeatmapset: mock(async () => {}),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmapsetsByBeatmapIds: mock(async () => ({ result: [{ id: 20 }, { id: 20 }], status: 200 })),
      getBeatmapSet: mock(async () => ({ result: fullSet, status: 200 })),
    } as unknown as MirrorsService;

    const response = await new BeatmapsService(storage, mirrors).getBeatmapsetsByBeatmapIds({ beatmapIds: [1, 2, 3] });

    expect(mirrors.getBeatmapsetsByBeatmapIds).toHaveBeenCalledWith({ beatmapIds: [2, 3] });
    expect(mirrors.getBeatmapSet).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual([storedSet, fullSet] as never);
  });

  it("reports beatmaps and sets missing after a full-set lookup", async () => {
    const storedSet = { id: 10, beatmaps: [{ id: 1 }] };
    const storage = {
      getBeatmapSetsByBeatmapIds: mock(async () => [storedSet]),
      getBeatmapSet: mock(async () => null),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmapsetsByBeatmapIds: mock(async () => ({ result: [{ id: 20 }], status: 200 })),
    } as unknown as MirrorsService;

    const response = await new BeatmapsService(storage, mirrors).getBeatmapsetsByBeatmapIds({ beatmapIds: [1, 2] });

    expect(response.data).toEqual([storedSet] as never);
    expect(response.message).toBe("Some beatmaps not found: 2; Some beatmapsets could not be fetched: 20");
  });

  it("reports beatmap IDs absent from a successful batch response", async () => {
    const storage = {
      getBeatmapSetsByBeatmapIds: mock(async () => []),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmapsetsByBeatmapIds: mock(async () => ({ result: [], status: 200 })),
    } as unknown as MirrorsService;

    const response = await new BeatmapsService(storage, mirrors).getBeatmapsetsByBeatmapIds({ beatmapIds: [2] });

    expect(response.data).toEqual([]);
    expect(response.message).toBe("Some beatmaps not found: 2");
  });

  it("returns the failed full-set status instead of a successful partial result", async () => {
    const storage = {
      getBeatmapSetsByBeatmapIds: mock(async () => []),
      getBeatmapSet: mock(async () => {}),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmapsetsByBeatmapIds: mock(async () => ({ result: [{ id: 20 }], status: 200 })),
      getBeatmapSet: mock(async () => ({ result: null, status: 503 })),
    } as unknown as MirrorsService;

    const response = await new BeatmapsService(storage, mirrors).getBeatmapsetsByBeatmapIds({ beatmapIds: [2] });

    expect(response.data).toBeNull();
    expect(response.status).toBe(503);
  });

  it("recognizes stored converts without contacting a mirror", async () => {
    const storedSet = { id: 10, beatmaps: [], converts: [{ id: 2 }] };
    const storage = {
      getBeatmapSetsByBeatmapIds: mock(async () => [storedSet]),
    } as unknown as StorageService;
    const mirrors = {
      getBeatmapsetsByBeatmapIds: mock(async () => ({ result: null, status: 500 })),
    } as unknown as MirrorsService;

    const response = await new BeatmapsService(storage, mirrors).getBeatmapsetsByBeatmapIds({ beatmapIds: [2] });

    expect(response.data).toEqual([storedSet] as never);
    expect(response.message).toBeUndefined();
    expect(mirrors.getBeatmapsetsByBeatmapIds).not.toHaveBeenCalled();
  });
});

describe("GET /api/v2/search", () => {
  it.each(["0", "101", "500"])("rejects limit=%s with 422", async (limit) => {
    const response = await beatmapsController.handle(new Request(`http://localhost/api/v2/search?limit=${limit}`));

    expect(response.status).toBe(422);
  });
});
