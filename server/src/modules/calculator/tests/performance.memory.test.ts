import { describe, expect, it } from "bun:test";
import * as rosu from "rosu-pp-js";

import { PerformanceHelper } from "../helper/performance.helper";

function wasmMemoryBytes() {
  return (rosu as unknown as { __wasm: { memory: WebAssembly.Memory } }).__wasm.memory.buffer.byteLength;
}

describe("PerformanceHelper WASM lifecycle", () => {
  const helper = new PerformanceHelper();
  const loadBuffer = () => Bun.file(`${import.meta.dir}/data/2809623.osu.test`).arrayBuffer();

  it("returns plain objects that serialize like rosu attributes", async () => {
    const beatmap = helper.ConvertBufferToBeatmap(await loadBuffer());

    try {
      const result = helper.CalculateScorePerfomance(beatmap, { accuracy: 99, isLazer: false, isScoreFailed: false });

      const performance = new rosu.Performance({
        accuracy: 99,
        mods: 0,
        hitresultPriority: rosu.HitResultPriority.BestCase,
        lazer: false,
        hitresultGenerators: Array.from({ length: 4 }, () => rosu.HitResultGenerator.Closest),
      });
      const reference = performance.calculate(beatmap);

      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(result.difficulty)).toBe(Object.prototype);
      expect(JSON.stringify(result)).toBe(JSON.stringify(reference));

      reference.free();
      performance.free();
    }
    finally {
      beatmap.free();
    }
  });

  it("does not grow WASM memory across repeated calculations", async () => {
    const buffer = await loadBuffer();
    const calculate = () => {
      const beatmap = helper.ConvertBufferToBeatmap(buffer);

      try {
        JSON.stringify(helper.CalculateBeatmapPerfomance(beatmap, [
          { accuracy: 99, isLazer: false, isScoreFailed: false },
          { accuracy: 95, isLazer: false, isScoreFailed: false },
        ]));
      }
      finally {
        beatmap.free();
      }
    };

    for (let i = 0; i < 20; i++) calculate();
    const before = wasmMemoryBytes();

    for (let i = 0; i < 300; i++) calculate();

    expect(wasmMemoryBytes() - before).toBeLessThanOrEqual(64 * 1024);
  }, 30_000);
});
