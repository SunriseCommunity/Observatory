import { Config, defineConfig } from "drizzle-kit";
import "dotenv/config";
import config from "../config";

export const dbCredentials = {
  host: config.POSTGRES_HOST,
  port: parseInt(config.POSTGRES_PORT),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
};

export default defineConfig({
  out: "./server/database/migrations",
  schema: "./server/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: `postgres://${dbCredentials.user}:${dbCredentials.password}@${dbCredentials.host}:${dbCredentials.port}/${dbCredentials.database}`,
  },
  migrations: {
    table: "drizzle_migrations",
    schema: "public",
  },
}) satisfies Config;
