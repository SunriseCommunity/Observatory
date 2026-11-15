import { exit } from "node:process";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import config from "../config";

const connection = postgres({
  host: config.POSTGRES_HOST,
  port: Number.parseInt(config.POSTGRES_PORT, 10),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
  max: 1,
});

await migrate(drizzle(connection), {
  migrationsFolder: `${import.meta.dirname}/migrations`,
});
exit(0);
