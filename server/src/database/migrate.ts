import { exit } from "process";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";

if (!Bun.env.POSTGRES_PASSWORD && !Bun.env.POSTGRES_USER) {
  console.error("Postgres credentials not provided");
  exit(1);
}

const connection = postgres({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB ?? "observatory",
  max: 1,
});

await migrate(drizzle(connection), {
  migrationsFolder: `${__dirname}/migrations`,
});
exit(0);
