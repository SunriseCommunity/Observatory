import path from "node:path";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "../src/database/client";
import { RedisInstance } from "../src/plugins/redisInstance";

const migrationPath = path.join(
  process.cwd(),
  "server/src/database/migrations",
);

try {
  await migrate(db, { migrationsFolder: migrationPath });
}
catch {
  throw new Error("Failed to migrate the database for testing");
}

await RedisInstance.flushdb();
