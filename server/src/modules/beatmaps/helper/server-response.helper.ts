import type { Context } from "elysia";

import type { ServerResponse } from "../model/beatmaps.model";

export function unwrapServerResponse<T>(response: ServerResponse<T>, set: Context["set"]) {
  if (response.source) {
    set.headers["X-Data-Source"] = response.source;
  }

  const { source: _, ...unwrapped } = response;
  return unwrapped?.data ?? unwrapped;
}
