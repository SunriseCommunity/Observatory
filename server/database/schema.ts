import { sql } from "drizzle-orm";
import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  ip: text("ip").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::timestamp without time zone`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()::timestamp without time zone`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
