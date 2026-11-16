import config from "@observatory/common/config";
import { expect, test } from "bun:test";

import packageJson from "../../../../../package.json";
import { BaseClient } from "../clients/base-client.abstract";

class TestClient extends BaseClient {
  constructor(baseUrl: string) {
    super({ baseUrl, abilities: [] }, { rateLimits: [] });
  }

  get apiClient() {
    return this.baseApi;
  }
}

test("mirror requests send the package version as User-Agent", async () => {
  const requests: Array<{ method: string; userAgent: string | null; authorization: string | null }> = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      requests.push({
        method: request.method,
        userAgent: request.headers.get("user-agent"),
        authorization: request.headers.get("authorization"),
      });
      return Response.json({ ok: true });
    },
  });
  const previous = config.IsAutomatedTesting;
  config.IsAutomatedTesting = false;

  try {
    const client = new TestClient(`http://127.0.0.1:${server.port}`);
    expect((await client.apiClient.get("download", { config: { responseType: "arraybuffer" } }))?.status).toBe(200);
    expect((await client.apiClient.get("authorized", { config: { headers: { Authorization: "Bearer test" } } }))?.status).toBe(200);
    expect((await client.apiClient.post("oauth/token", { body: { grant_type: "client_credentials" } }))?.status).toBe(200);
    expect(requests).toEqual([
      { method: "GET", userAgent: `observatory-sunrise/${packageJson.version}`, authorization: null },
      { method: "GET", userAgent: `observatory-sunrise/${packageJson.version}`, authorization: "Bearer test" },
      { method: "POST", userAgent: `observatory-sunrise/${packageJson.version}`, authorization: null },
    ]);
  }
  finally {
    config.IsAutomatedTesting = previous;
    server.stop(true);
  }
});
