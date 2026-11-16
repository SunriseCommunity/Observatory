import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import config from "../config";

const pool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number.parseInt(config.POSTGRES_PORT, 10),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
  max: 1,
});

await migrate(drizzle(pool), {
  migrationsFolder: `${import.meta.dirname}/migrations`,
});
await pool.end();
