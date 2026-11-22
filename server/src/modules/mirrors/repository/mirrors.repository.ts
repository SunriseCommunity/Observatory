import { db } from "@observatory/common/database/client";
import type { Mirror, NewMirror } from "@observatory/common/database/schema";
import { mirrors } from "@observatory/common/database/schema";
import { eq } from "drizzle-orm";

export abstract class MirrorsRepository {
  static async getByUrl(url: string): Promise<Mirror | null> {
    const entities = await db
      .select()
      .from(mirrors)
      .where(eq(mirrors.url, url));
    return entities[0] ?? null;
  }

  static async getAll(): Promise<Mirror[]> {
    return db.select().from(mirrors);
  }

  static async update(
    mirrorId: number,
    data: Partial<NewMirror>,
  ): Promise<void> {
    await db.update(mirrors).set(data).where(eq(mirrors.mirrorId, mirrorId));
  }

  static async create(data: NewMirror): Promise<Mirror> {
    const entities = await db.insert(mirrors).values(data).returning();
    return entities[0];
  }
}
