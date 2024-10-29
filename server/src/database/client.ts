import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import config from "../config";
export type DB = NodePgDatabase<typeof schema>;

class DbConnection {
  private static instance: DbConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: config.POSTGRES_HOST,
      port: parseInt(config.POSTGRES_PORT, 10),
      user: config.POSTGRES_USER,
      password: config.POSTGRES_PASSWORD,
      database: config.POSTGRES_DB,
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
