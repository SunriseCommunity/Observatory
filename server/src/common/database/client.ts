import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import config from "../config";
import logger from "../observability/logger";
import * as schema from "./schema";

const pool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number.parseInt(config.POSTGRES_PORT, 10),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
  max: 10,
});

pool.on("error", (err) => logger.error({ err }, "postgres idle client error"));

export const db = drizzle(pool, { schema });
export const closeDatabase = () => pool.end();
