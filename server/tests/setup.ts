import path from "node:path";

import { db } from "@observatory/common/database/client";
import { RedisInstance } from "@observatory/common/redis/redis";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationPath = path.join(
  process.cwd(),
  "server/src/common/database/migrations",
);

try {
  await migrate(db, { migrationsFolder: migrationPath });
}
catch {
  throw new Error("Failed to migrate the database for testing");
}

await RedisInstance.flushdb();
