import { db } from "@observatory/common/database/client";
import type { Mirror, NewMirror } from "@observatory/common/database/schema";
import { mirrors } from "@observatory/common/database/schema";
import { eq } from "drizzle-orm";

export async function getMirrorByUrl(url: string): Promise<Mirror | null> {
  const entities = await db
    .select()
    .from(mirrors)
    .where(eq(mirrors.url, url));
  return entities[0] ?? null;
}

export async function getMirrors(): Promise<Mirror[]> {
  return db.select().from(mirrors);
}

export async function updateMirror(
  mirrorId: number,
  data: Partial<NewMirror>,
): Promise<void> {
  await db.update(mirrors).set(data).where(eq(mirrors.mirrorId, mirrorId));
}

export async function createMirror(data: NewMirror): Promise<Mirror> {
  const entities = await db.insert(mirrors).values(data).returning();
  return entities[0];
}
