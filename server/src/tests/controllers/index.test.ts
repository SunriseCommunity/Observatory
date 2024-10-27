import Elysia from "elysia";
import { describe, expect, it } from "bun:test";

import indexController from "../../controllers/index";
import { mockUser } from "../utils/mockUser";

describe("Index Controller", () => {
  it("should return 'Hello, {user.ip}!'", async () => {
    const app = new Elysia().use(indexController);

    const { user, headers } = mockUser();

    const result = await app
      .handle(new Request("http://localhost/", { method: "GET", headers }))
      .then((res) => res.text());

    expect(result).toEqual(`Hello, ${user.ip}!`);
  });
});
