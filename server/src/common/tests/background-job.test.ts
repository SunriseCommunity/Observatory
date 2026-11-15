import { describe, expect, it } from "bun:test";

import { startBackgroundJob } from "../lifecycle/background-job";

describe("startBackgroundJob", () => {
  it("skips a tick while the previous run is still in progress", async () => {
    let started = 0;
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });

    const job = startBackgroundJob({
      name: "test",
      intervalMs: 10,
      run: async () => {
        started++;
        await blocker;
      },
    });

    await Bun.sleep(60);
    expect(started).toBe(1);

    release();
    await job.stop();
  });

  it("stop() waits for the in-flight run and prevents further runs", async () => {
    let started = 0;
    let finished = false;

    const job = startBackgroundJob({
      name: "test",
      intervalMs: 10,
      run: async () => {
        started++;
        await Bun.sleep(40);
        finished = true;
      },
    });

    await job.stop();
    expect(finished).toBe(true);

    await Bun.sleep(40);
    expect(started).toBe(1);
  });

  it("keeps running after a failed run", async () => {
    let calls = 0;

    const job = startBackgroundJob({
      name: "test",
      intervalMs: 10,
      run: async () => {
        calls++;
        throw new Error("boom");
      },
    });

    await Bun.sleep(45);
    await job.stop();
    expect(calls).toBeGreaterThan(1);
  });
});
