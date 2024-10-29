import { color } from "bun";
import dotenv from "dotenv";
import { exit } from "process";

dotenv.config();

const {
  PORT,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  BANCHO_CLIENT_SECRET,
  BANCHO_CLIENT_ID,
  DEBUG_MODE,
  LOKI_HOST,
} = Bun.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD) {
  console.error(
    `${color("#ff0000")} Missing required environment variables for Postgres`
  );
  exit(1);
}

if (!BANCHO_CLIENT_SECRET || !BANCHO_CLIENT_ID) {
  // TODO: Maybe ignore bancho if not provided ?
  console.error(
    `${color("#ff0000")} Missing required environment variables for osu! Bancho`
  );
  exit(1);
}

const config: {
  PORT: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: string;
  POSTGRES_DB: string;
  BANCHO_CLIENT_SECRET: string;
  BANCHO_CLIENT_ID: string;
  LOKI_HOST: string;
  IsProduction: boolean;
  IsDebug: boolean;
} = {
  PORT: PORT ?? "3000",
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_HOST: POSTGRES_HOST ?? "localhost",
  POSTGRES_PORT: POSTGRES_PORT ?? "5432",
  POSTGRES_DB: POSTGRES_DB ?? "observatory",
  BANCHO_CLIENT_SECRET,
  BANCHO_CLIENT_ID,
  LOKI_HOST: LOKI_HOST ?? "http://localhost:3100",
  IsProduction: Bun.env.NODE_ENV === "production",
  IsDebug: DEBUG_MODE === "true",
};

export default config;
