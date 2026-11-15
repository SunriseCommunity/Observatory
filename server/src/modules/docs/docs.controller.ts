import type { ElysiaOpenAPIConfig } from "@elysia/openapi";
import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";

const openapiOptions: ElysiaOpenAPIConfig<true, "/docs"> = {
  documentation: {
    info: {
      title: Bun.env.npm_package_name ?? "Observatory API",
      version: Bun.env.npm_package_version ?? "1.0.0",
      description:
                Bun.env.npm_package_description ?? "API for Observatory",
    },
  },
  exclude: { paths: ["/"] },
  path: "/docs",
};

export const rootController = new Elysia()
  .get("/", ({ redirect }) => {
    return redirect("/docs");
  });

export const docsPlugin = openapi(openapiOptions);

export const faviconController = new Elysia()
  .get("/favicon.ico", () => Bun.file("./server/public/favicon.ico"));
