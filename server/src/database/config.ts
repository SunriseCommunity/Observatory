import { Config, defineConfig } from "drizzle-kit";
import "dotenv/config";

export const dbCredentials = {
  host: process.env.POSTGRES_HOST || "0.0.0.0",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "observatory",
};

export default defineConfig({
  out: "./server/database/migrations",
  schema: "./server/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: `postgres://${dbCredentials.user}:${dbCredentials.password}@${dbCredentials.host}:${dbCredentials.port}/${dbCredentials.database}`,
    ssl: process.env.POSTGRES_SSL === "true",
  },
  migrations: {
    table: "drizzle_migrations",
    schema: "public",
  },
}) satisfies Config;
