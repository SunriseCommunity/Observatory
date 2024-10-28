import { eq } from "drizzle-orm";
import { db } from "../client";
import { NewUser, User, users } from "../schema";

export async function getUserByUsername(ip: string): Promise<User | null> {
  const user = await db.select().from(users).where(eq(users.ip, ip));
  return user[0] ?? null;
}

export async function createUser(data: NewUser): Promise<User> {
  const user = await db.insert(users).values(data).returning();
  return user[0];
}
