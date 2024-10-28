import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { exit } from "process";
import "dotenv/config";

import * as schema from "./schema";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
export type DB = NodePgDatabase<typeof schema>;

if (!Bun.env.POSTGRES_PASSWORD && !Bun.env.POSTGRES_USER) {
  console.error("Postgres credentials not provided");
  exit(1);
}

class DbConnection {
  private static instance: DbConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB ?? "observatory",
      max: 10,
    });
  }

  public static getInstance(): DbConnection {
    if (!DbConnection.instance) {
      DbConnection.instance = new DbConnection();
    }
    return DbConnection.instance;
  }

  public getClient(): DB {
    return drizzle(this.pool, {
      schema,
    });
  }
}

const dbConnection = DbConnection.getInstance();
export const db = dbConnection.getClient();
