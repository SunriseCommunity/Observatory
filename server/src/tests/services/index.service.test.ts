import { describe, expect, it } from "bun:test";
import { IndexService } from "../../services/index.service";
import { mockUser } from "../utils/mockUser";

describe("Index Service", () => {
  it("should return 'Hello, {user.ip}!'", async () => {
    const service = new IndexService();

    const { user } = mockUser();

    const result = await service.get(user.ip);

    expect(result).toEqual(`Hello, ${user.ip}!`);
  });
});
