import { cp, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { bunPluginPino } from "bun-plugin-pino";

import packageJson from "./package.json";

await rm("dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./server/src/index.ts", "./server/src/common/database/migrate.ts"],
  compile: false, // This is intentional. https://github.com/oven-sh/bun/issues/11366#issuecomment-2253749603
  root: "./server/src",
  outdir: "./dist",
  target: "bun",
  define: { "process.env.NODE_ENV": "Bun.env.NODE_ENV" },
  minify: { whitespace: true, syntax: true },
  external: ["rosu-pp-js"],
  plugins: [bunPluginPino({ transports: ["pino-pretty", "pino-loki"] })],
});

if (!result.success) {
  throw new AggregateError(result.logs, "Backend build failed");
}

await cp(dirname(fileURLToPath(import.meta.resolve("rosu-pp-js/package.json"))), "dist/node_modules/rosu-pp-js", { recursive: true });
await cp("server/src/common/database/migrations", "dist/common/database/migrations", { recursive: true });
await cp("server/public", "dist/server/public", { recursive: true });
await mkdir("dist/data", { recursive: true });
await Bun.write("dist/package.json", JSON.stringify({
  name: packageJson.name,
  type: packageJson.type,
  version: packageJson.version,
  description: packageJson.description,
  scripts: {
    "db:migration": "bun common/database/migrate.js",
    "start": "bun index.js",
  },
}, null, 2));
