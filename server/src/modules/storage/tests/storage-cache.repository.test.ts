import type { Beatmapset } from "@observatory/common/types/beatmap";
import { GameModeInt } from "@observatory/common/types/gameMode";
import { describe, expect, it } from "bun:test";

import { StorageCacheRepository } from "../repository/storage-cache.repository";

describe("storage cache repository search results", () => {
  it("keys results by field name, not by field position", async () => {
    const result = [{ id: 1 }] as Beatmapset[];

    await StorageCacheRepository.insertSearchResult({ limit: 50, mode: GameModeInt.OSU_MANIA }, result);

    expect(await StorageCacheRepository.getSearchResult({ limit: 50, offset: 3 })).toBeUndefined();
    expect(await StorageCacheRepository.getSearchResult({ limit: 50, query: "3" })).toBeUndefined();
    expect(await StorageCacheRepository.getSearchResult({ mode: GameModeInt.OSU_MANIA, limit: 50 })).toEqual(result);
  });
});
