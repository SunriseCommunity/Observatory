import "dotenv/config";

import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

import config from "../config";

export const dbCredentials = {
  host: config.POSTGRES_HOST,
  port: Number.parseInt(config.POSTGRES_PORT, 10),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
};

export default defineConfig({
  out: "./server/src/database/migrations",
  schema: "./server/src/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: `postgres://${dbCredentials.user}:${dbCredentials.password}@${dbCredentials.host}:${dbCredentials.port}/${dbCredentials.database}`,
  },
  migrations: {
    table: "drizzle_migrations",
    schema: "public",
  },
}) satisfies Config;
