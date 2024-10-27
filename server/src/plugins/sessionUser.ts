import Elysia from "elysia";
import { ip } from "elysia-ip";

export const sessionUser = new Elysia({ name: "sessionUser" })
  .use(ip())
  .resolve({ as: "scoped" }, ({ ip }) => ({
    user: {
      ip,
    },
  }));
