import type { Beatmapset } from "@observatory/common/types/beatmap";
import { GameModeInt } from "@observatory/common/types/gameMode";
import { describe, expect, it } from "bun:test";

import { StorageCacheService } from "../service/storage-cache.service";

describe("StorageCacheService search results", () => {
  const cache = new StorageCacheService();

  it("keys results by field name, not by field position", async () => {
    const result = [{ id: 1 }] as Beatmapset[];

    await cache.insertSearchResult({ limit: 50, mode: GameModeInt.OSU_MANIA }, result);

    expect(await cache.getSearchResult({ limit: 50, offset: 3 })).toBeUndefined();
    expect(await cache.getSearchResult({ limit: 50, query: "3" })).toBeUndefined();
    expect(await cache.getSearchResult({ mode: GameModeInt.OSU_MANIA, limit: 50 })).toEqual(result);
  });
});
