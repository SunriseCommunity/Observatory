/**
 * Architecture boundary rules for the Observatory server (docs/architecture.md).
 *
 * Module layout: entry points (`*.controller.ts`, `*.cron.controller.ts`) at the module root;
 * `service/`, `helper/`, `repository/`, `model/`, `clients/`, `tests/` folders.
 * Patterns are anchored with `(?:^|/)modules/` so node_modules never matches.
 * Module tests/ folders are exempt from cross-module rules because they stub and seed foreign modules;
 * server/tests/ is exempt from the host rule.
 *
 * @type {import("dependency-cruiser").IConfiguration}
 */
const fs = require("node:fs");
const path = require("node:path");

const MODULE_TESTS = "(?:^|/)modules/[^/]+/tests/";

// Only files a module publishes through package.json "exports" (other than its controllers) may be called
// across modules.
const MODULE_ROOTS = ["server/src/modules"];

function escapeRegExp(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PUBLIC_RUNTIME = MODULE_ROOTS.flatMap(root =>
  fs.readdirSync(path.join(__dirname, root), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(__dirname, root, entry.name, "package.json")))
    .flatMap((entry) => {
      const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, root, entry.name, "package.json"), "utf8"));
      return Object.values(manifest.exports ?? {})
        .filter(target => !target.endsWith(".controller.ts"))
        .map(target => `(?:^|/)modules/${escapeRegExp(entry.name)}/${escapeRegExp(target.replace(/^\.\//, ""))}$`);
    }),
);

module.exports = {
  forbidden: [
    {
      name: "modules-only-import-public-entry-points",
      severity: "error",
      comment: "Another module may only be reached through the helper files its package.json publishes.",
      from: { path: "(?:^|/)modules/([^/]+)/", pathNot: MODULE_TESTS },
      to: {
        path: "(?:^|/)modules/([^/]+)/",
        pathNot: ["(?:^|/)modules/$1/", ...PUBLIC_RUNTIME],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "modules-type-imports-only-from-models",
      severity: "error",
      comment: "Type-only imports from another module are limited to its model/ files and published helpers.",
      from: { path: "(?:^|/)modules/([^/]+)/", pathNot: MODULE_TESTS },
      to: {
        path: "(?:^|/)modules/([^/]+)/",
        pathNot: ["(?:^|/)modules/$1/", "(?:^|/)modules/[^/]+/model/", ...PUBLIC_RUNTIME],
        dependencyTypes: ["type-only"],
      },
    },
    {
      name: "controllers-call-own-services-only",
      severity: "error",
      comment:
        "An HTTP or cron controller adapts the trigger and calls its own service; presentation helpers stay in its own module.",
      from: { path: "(?:^|/)modules/([^/]+)/[^/]+\\.controller\\.ts$" },
      to: {
        path: "(?:^|/)modules/",
        pathNot: [
          "(?:^|/)modules/$1/(service|model)/",
          "(?:^|/)modules/$1/helper/",
          "(?:^|/)modules/[^/]+/model/[^/]+\\.schema\\.ts$",
        ],
      },
    },
    {
      name: "services-do-not-call-services",
      severity: "error",
      comment: "Services coordinate controller and cron workflows without calling other services.",
      from: { path: "(?:^|/)modules/[^/]+/service/" },
      to: { path: "(?:^|/)modules/[^/]+/service/" },
    },
    {
      name: "services-do-not-call-foreign-persistence",
      severity: "error",
      comment: "Services may use their own module's repositories, never another module's persistence.",
      from: { path: "(?:^|/)modules/([^/]+)/service/" },
      to: {
        path: "(?:^|/)modules/[^/]+/repository/",
        pathNot: "(?:^|/)modules/$1/repository/",
      },
    },
    {
      name: "services-do-not-reach-runtime-clients",
      severity: "error",
      comment: "Stateful clients are owned by the module's helpers.",
      from: { path: "(?:^|/)modules/[^/]+/service/" },
      to: { path: "(?:^|/)modules/[^/]+/clients/" },
    },
    {
      name: "helpers-do-not-call-services-or-controllers",
      severity: "error",
      from: { path: "(?:^|/)modules/[^/]+/helper/" },
      to: { path: "(?:^|/)modules/[^/]+/service/|\\.controller\\.ts$" },
    },
    {
      name: "clients-do-not-call-services-or-controllers",
      severity: "error",
      comment: "Runtime clients may use their module's helpers and repositories, never business services.",
      from: { path: "(?:^|/)modules/[^/]+/clients/" },
      to: { path: "(?:^|/)modules/[^/]+/service/|\\.controller\\.ts$" },
    },
    {
      name: "persistence-stays-thin",
      severity: "error",
      comment: "Repositories contain persistence access and mapping only.",
      from: { path: "(?:^|/)modules/[^/]+/repository/" },
      to: { path: "(?:^|/)modules/[^/]+/(service|helper|clients)/|\\.controller\\.ts$" },
    },
    {
      name: "common-does-not-import-modules",
      severity: "error",
      from: { path: "(?:^|/)common/" },
      to: { path: "(?:^|/)modules/" },
    },
    {
      name: "host-only-imports-controllers",
      severity: "error",
      comment: "Only app.ts and index.ts compose HTTP and cron controllers.",
      from: { pathNot: ["^server/src/app\\.ts$", "^server/src/index\\.ts$", MODULE_TESTS, "^server/tests/"] },
      to: { path: "\\.controller\\.ts$" },
    },
    {
      name: "no-runtime-circular",
      severity: "error",
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ["type-only"] } },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: { path: ["^dist/", "^data/"] },
    tsPreCompilationDeps: "specify",
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".d.ts"],
    },
    skipAnalysisNotInRules: true,
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
