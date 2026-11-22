import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import AdmZip from "adm-zip";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { StorageFilesHelper } from "../helper/storage-files.helper";

describe("StorageFilesHelper no-video variant", () => {
  let dir: string;
  let oszPath: string;
  const service = StorageFilesHelper;
  const getZippedFile = (file: string, noVideo: boolean): Promise<ArrayBuffer> =>
    (service as unknown as { getZippedFile: (p: string, ctx: { noVideo: boolean }) => Promise<ArrayBuffer> })
      .getZippedFile(file, { noVideo });

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "observatory-osz-"));
    oszPath = path.join(dir, "1.osz");

    const zip = new AdmZip();
    zip.addFile("map.osu", Buffer.from("osu file format v14"));
    zip.addFile("video.mp4", Buffer.alloc(1024));
    zip.writeZip(oszPath);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("repacks once without video and reuses the stored variant", async () => {
    const first = await getZippedFile(oszPath, true);
    const noVideoPath = path.join(dir, "1n.osz");
    const { mtimeMs } = await stat(noVideoPath);

    const entries = new AdmZip(Buffer.from(first)).getEntries().map(entry => entry.entryName);
    expect(entries).toEqual(["map.osu"]);

    await Bun.sleep(20);
    const second = await getZippedFile(oszPath, true);

    expect((await stat(noVideoPath)).mtimeMs).toBe(mtimeMs);
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });
});
