import config from "@observatory/common/config";
import { recordExternalApiResponse } from "@observatory/common/observability/external-api-metrics";
import logger from "@observatory/common/observability/logger";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { isAxiosError } from "axios";

import { RequestsRepository } from "../../repository/requests.repository";
import type { BaseApiOptions } from "./base-api.types";

/** Turns "api/v2/b/123?x=1" into "api/v2/b/:id" so metrics and span names stay low-cardinality. */
export function routeTemplate(endpoint: string): string {
  return endpoint
    .split("?")[0]
    .split("/")
    .map(segment => (/^\d+n?$|^[a-f0-9]{32}$/i.test(segment) ? ":id" : segment))
    .join("/");
}

export class BaseApi {
  readonly mirror: string;

  constructor(
    private readonly axios: AxiosInstance,
    private readonly config: AxiosRequestConfig,
  ) {
    this.mirror = new URL(config.baseURL ?? "http://localhost").host;
  }

  public get<Q>(endpoint: string, options?: BaseApiOptions) {
    return this.request<Q>("get", endpoint, options);
  }

  public post<Q, B = unknown>(endpoint: string, options?: BaseApiOptions<B>) {
    return this.request<Q>("post", endpoint, options);
  }

  private async request<Q>(
    method: "get" | "post",
    endpoint: string,
    options?: BaseApiOptions,
  ): Promise<AxiosResponse<Q> | null> {
    if (config.IsAutomatedTesting) {
      throw new Error("Please mock the API request for automated testing");
    }

    const url = `${this.config.baseURL}/${endpoint}`;
    const route = routeTemplate(endpoint);

    // Look the tracer up per call: this module loads before the SDK starts, and a tracer taken then never records.
    return trace.getTracer("mirrors").startActiveSpan(`${method.toUpperCase()} ${this.mirror}/${route}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        "http.request.method": method.toUpperCase(),
        "server.address": this.mirror,
        "url.full": url,
      },
    }, async (span) => {
      const startedAt = performance.now();
      let response: AxiosResponse<Q> | null = null;
      let error: string | undefined;

      try {
        response = await this.axios.request<Q>({
          ...this.config,
          ...options?.config,
          method,
          url,
          data: options?.body,
        });
      }
      catch (e: unknown) {
        if (isAxiosError<Q>(e) && e.response) {
          response = e.response;
        }
        else {
          // Only the message: an AxiosError serializes its request config, Bancho credentials included.
          error = e instanceof Error ? e.message : String(e);
        }
      }

      const latency = Math.round(performance.now() - startedAt);
      recordExternalApiResponse(this.mirror, route, method.toUpperCase(), response?.status ?? 0, latency / 1000);

      if (response) {
        span.setAttribute("http.response.status_code", response.status);
        if (response.status >= 500)
          span.setStatus({ code: SpanStatusCode.ERROR });
      }
      else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error });
        logger.warn({ mirror: this.mirror, method, endpoint, duration_ms: latency, err: error }, "Mirror request got no response");
      }
      span.end();

      const isDownload = response?.config.responseType === "arraybuffer";
      const bytes = isDownload ? (response?.data as ArrayBuffer | undefined)?.byteLength ?? 0 : 0;
      const errorBody: unknown = response && response.status !== 200 ? response.data : undefined;

      this.saveRequest({
        baseUrl: this.config.baseURL ?? "localhost",
        url,
        method,
        status: response?.status ?? 500,
        latency,
        contentType: response ? response.headers["content-type"]?.split(";")[0] : null,
        downloadSpeed: isDownload ? Math.round(bytes / 1024 / (latency / 1000)) : undefined,
        data: error ?? (typeof errorBody === "string" || errorBody == null ? errorBody : JSON.stringify(errorBody)),
      });

      return response;
    });
  }

  private async saveRequest(data: Parameters<typeof RequestsRepository.create>[0]) {
    try {
      await RequestsRepository.create(data);
    }
    catch (error) {
      logger.error({ err: error, mirror: this.mirror }, "BaseApi: failed to save request");
    }
  }
}
