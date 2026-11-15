import type { ServerResponse } from "../model/beatmaps.model";

export function unwrapServerResponse<T>(response: ServerResponse<T>, headers: Record<string, string | number | string[]>) {
  if (response.source) {
    headers["X-Data-Source"] = response.source;
  }

  const { source: _, ...unwrapped } = response;
  return unwrapped?.data ?? unwrapped;
}
