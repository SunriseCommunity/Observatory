import { Elysia } from "elysia";

export const requestIdPlugin = new Elysia({ name: "request-id" })
  .onRequest(({ set, request: { headers } }) => {
    set.headers["X-Request-ID"] = headers.get("X-Request-ID") || crypto.randomUUID();
  })
  .as("global");
