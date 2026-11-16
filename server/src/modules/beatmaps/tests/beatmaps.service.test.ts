import { MirrorsHelper } from "@observatory/mirrors";
import { StorageHelper } from "@observatory/storage";
import { afterEach, beforeEach, describe, expect, it, jest, spyOn } from "bun:test";

import { beatmapsController } from "../beatmaps.controller";
import { BeatmapsService } from "../service/beatmaps.service";

type StaticMethods<T> = { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never }[keyof T];

function stub<T extends object>(target: T, impls: Partial<Record<StaticMethods<T>, (...args: any[]) => unknown>>) {
  for (const [name, impl] of Object.entries(impls))
    spyOn(target as any, name).mockImplementation(impl as never);
  return target as any;
}

function failOnUnexpectedCalls(target: object) {
  for (const name of Object.getOwnPropertyNames(target)) {
    if (typeof (target as any)[name] === "function" && name !== "constructor") {
      spyOn(target as any, name).mockImplementation(() => {
        throw new Error(`unexpected call to ${name}`);
      });
    }
  }
}

describe("BeatmapsService", () => {
  beforeEach(() => {
    failOnUnexpectedCalls(StorageHelper);
    failOnUnexpectedCalls(MirrorsHelper);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns an independent error body per failed request", async () => {
    const statuses = [503, 502];
    stub(StorageHelper, { getBeatmap: async () => {} });
    stub(MirrorsHelper, { getBeatmap: async () => ({ result: null, status: statuses.shift()! }) });

    const first = await BeatmapsService.getBeatmap({ beatmapId: 1 });
    const second = await BeatmapsService.getBeatmap({ beatmapId: 2 });

    expect(first.status).toBe(503);
    expect(second.status).toBe(502);
    expect(first).not.toBe(second);
  });

  it.each([true, false])("caches mirror beatmaps when allowMissingNonBeatmapValues=%p", async (allowMissingNonBeatmapValues) => {
    const storage = stub(StorageHelper, {
      getBeatmap: async () => {},
      insertBeatmap: async () => {},
    });
    stub(MirrorsHelper, { getBeatmap: async () => ({ result: { id: 1 }, status: 200 }) });

    const ctx = { beatmapId: 1, allowMissingNonBeatmapValues };
    await BeatmapsService.getBeatmap(ctx);

    expect(storage.insertBeatmap).toHaveBeenCalledWith({ id: 1 }, ctx);
  });

  it("caches missing beatmaps when partial data is allowed", async () => {
    const storage = stub(StorageHelper, {
      getBeatmap: async () => {},
      insertBeatmap: async () => {},
    });
    stub(MirrorsHelper, { getBeatmap: async () => ({ result: null, status: 404 }) });
    const ctx = { beatmapId: 1, allowMissingNonBeatmapValues: true };

    await BeatmapsService.getBeatmap(ctx);

    expect(storage.insertBeatmap).toHaveBeenCalledWith(null, ctx);
  });

  it("caches an embedded mirror set without exposing it in the response", async () => {
    const beatmap = { id: 1, beatmapset_id: 10 };
    const beatmapset = { id: 10, beatmaps: [beatmap] };
    const storage = stub(StorageHelper, {
      getBeatmap: async () => {},
      insertBeatmap: async () => {},
      insertBeatmapset: async () => {},
    });
    stub(MirrorsHelper, { getBeatmap: async () => ({ result: beatmap, status: 200, beatmapset }) });

    const response = await BeatmapsService.getBeatmap({ beatmapId: 1 });

    expect(storage.insertBeatmapset).toHaveBeenCalledTimes(1);
    expect(storage.insertBeatmapset).toHaveBeenCalledWith(beatmapset, { beatmapSetId: beatmapset.id });
    expect(response).toEqual({ data: beatmap, status: 200, message: undefined, source: "mirror" } as never);
    expect(response).not.toHaveProperty("beatmapset");
    expect(response.data).not.toHaveProperty("beatmapset");
  });

  it("does not cache a set when the mirror returns no embedded set", async () => {
    const storage = stub(StorageHelper, {
      getBeatmap: async () => {},
      insertBeatmap: async () => {},
      insertBeatmapset: async () => {},
    });
    stub(MirrorsHelper, { getBeatmap: async () => ({ result: { id: 1 }, status: 200 }) });

    await BeatmapsService.getBeatmap({ beatmapId: 1 });

    expect(storage.insertBeatmapset).not.toHaveBeenCalled();
  });

  it("does not wait for an embedded mirror set to be cached", async () => {
    stub(StorageHelper, {
      getBeatmap: async () => {},
      insertBeatmap: async () => {},
      insertBeatmapset: () => new Promise(() => {}),
    });
    stub(MirrorsHelper, { getBeatmap: async () => ({ result: { id: 1 }, status: 200, beatmapset: { id: 10 } }) });

    const response = await BeatmapsService.getBeatmap({ beatmapId: 1 });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ id: 1 } as never);
  });

  it("fetches each beatmapset missing from storage once in full", async () => {
    const storedSet = { id: 10, beatmaps: [{ id: 1 }] };
    const fullSet = { id: 20, beatmaps: [{ id: 2 }, { id: 3 }] };
    stub(StorageHelper, {
      getBeatmapSetsByBeatmapIds: async () => [storedSet],
      getBeatmapSet: async () => {},
      insertBeatmapset: async () => {},
    });
    const mirrors = stub(MirrorsHelper, {
      getBeatmapsetsByBeatmapIds: async () => ({ result: [{ id: 20 }, { id: 20 }], status: 200 }),
      getBeatmapSet: async () => ({ result: fullSet, status: 200 }),
    });

    const response = await BeatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: [1, 2, 3] });

    expect(mirrors.getBeatmapsetsByBeatmapIds).toHaveBeenCalledWith({ beatmapIds: [2, 3] });
    expect(mirrors.getBeatmapSet).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual([storedSet, fullSet] as never);
  });

  it("reports beatmaps and sets missing after a full-set lookup", async () => {
    const storedSet = { id: 10, beatmaps: [{ id: 1 }] };
    stub(StorageHelper, {
      getBeatmapSetsByBeatmapIds: async () => [storedSet],
      getBeatmapSet: async () => null,
    });
    stub(MirrorsHelper, { getBeatmapsetsByBeatmapIds: async () => ({ result: [{ id: 20 }], status: 200 }) });

    const response = await BeatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: [1, 2] });

    expect(response.data).toEqual([storedSet] as never);
    expect(response.message).toBe("Some beatmaps not found: 2; Some beatmapsets could not be fetched: 20");
  });

  it("reports beatmap IDs absent from a successful batch response", async () => {
    stub(StorageHelper, { getBeatmapSetsByBeatmapIds: async () => [] });
    stub(MirrorsHelper, { getBeatmapsetsByBeatmapIds: async () => ({ result: [], status: 200 }) });

    const response = await BeatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: [2] });

    expect(response.data).toEqual([]);
    expect(response.message).toBe("Some beatmaps not found: 2");
  });

  it("returns the failed full-set status instead of a successful partial result", async () => {
    stub(StorageHelper, {
      getBeatmapSetsByBeatmapIds: async () => [],
      getBeatmapSet: async () => {},
    });
    stub(MirrorsHelper, {
      getBeatmapsetsByBeatmapIds: async () => ({ result: [{ id: 20 }], status: 200 }),
      getBeatmapSet: async () => ({ result: null, status: 503 }),
    });

    const response = await BeatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: [2] });

    expect(response.data).toBeNull();
    expect(response.status).toBe(503);
  });

  it("recognizes stored converts without contacting a mirror", async () => {
    const storedSet = { id: 10, beatmaps: [], converts: [{ id: 2 }] };
    stub(StorageHelper, { getBeatmapSetsByBeatmapIds: async () => [storedSet] });
    const mirrors = stub(MirrorsHelper, { getBeatmapsetsByBeatmapIds: async () => ({ result: null, status: 500 }) });

    const response = await BeatmapsService.getBeatmapsetsByBeatmapIds({ beatmapIds: [2] });

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
