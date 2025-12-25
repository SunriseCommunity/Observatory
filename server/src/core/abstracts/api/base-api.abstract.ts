import type { Axios, AxiosRequestConfig, AxiosResponse } from "axios";
import { AxiosError } from "axios";

import config from "../../../config";
import { createRequest } from "../../../database/models/requests";
import { logExternalRequest } from "../../../utils/logger";
import type { AxiosResponseLog, BaseApiOptions } from "./base-api.types";

export class BaseApi {
  constructor(
    private readonly axios: Axios,
    private readonly config: AxiosRequestConfig,
  ) {
    axios.interceptors.request.use((config) => {
      config.headers["request-startTime"] = Date.now();
      return config;
    });

    axios.interceptors.response.use((response) => {
      const currentTime = Date.now();
      const startTime = response.config.headers["request-startTime"];
      response.headers["request-duration"] = currentTime - startTime;
      return response;
    });
  }

  private throwIfAutomatedTesting() {
    if (config.IsAutomatedTesting) {
      throw new Error(
        "Please mock the API request for automated testing",
      );
    }
  }

  public async get<
    Q,
    B extends Record<string, never> = Record<string, never>,
  >(endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedUrlWithAttachedParams = this.attachParams(
      formedUrl,
      options?.body,
    );
    const formedConfig = this.formConfig(options?.config);

    this.throwIfAutomatedTesting();

    try {
      const res = await this.axios.get<Q>(
        formedUrlWithAttachedParams,
        formedConfig,
      );

      this.handleResponse(res);
      return res;
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response) {
        this.handleResponse(e.response);
        return e.response as AxiosResponse<Q>;
      }
      this.handleResponse(e);
      return null;
    }
  }

  public async post<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    this.throwIfAutomatedTesting();

    try {
      const res = await this.axios.post<Q>(
        formedUrl,
        options?.body,
        formedConfig,
      );

      this.handleResponse(res);
      return res;
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response) {
        this.handleResponse(e.response);
        return e.response as AxiosResponse<Q>;
      }
      this.handleResponse(e);
      return null;
    }
  }

  public async put<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    this.throwIfAutomatedTesting();

    try {
      const res = await this.axios.put<Q>(
        formedUrl,
        options?.body,
        formedConfig,
      );

      this.handleResponse(res);
      return res;
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response) {
        this.handleResponse(e.response);
        return e.response as AxiosResponse<Q>;
      }
      this.handleResponse(e);
      return null;
    }
  }

  public async patch<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    this.throwIfAutomatedTesting();

    try {
      const res = await this.axios.patch<Q>(
        formedUrl,
        options?.body,
        formedConfig,
      );

      this.handleResponse(res);
      return res;
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response) {
        this.handleResponse(e.response);
        return e.response as AxiosResponse<Q>;
      }
      this.handleResponse(e);
      return null;
    }
  }

  public async delete<Q, B extends Record<string, any>>(
    endpoint: string,
    options?: BaseApiOptions<B>,
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    this.throwIfAutomatedTesting();

    try {
      const res = await this.axios.delete<Q>(formedUrl, formedConfig);

      this.handleResponse(res);
      return res;
    }
    catch (e: unknown) {
      if (e instanceof AxiosError && e.response) {
        this.handleResponse(e.response);
        return e.response as AxiosResponse<Q>;
      }
      this.handleResponse(e);
      return null;
    }
  }

  public get axiosConfig() {
    return this.config;
  }

  private handleResponse(res: any) {
    if (!res)
      return;
    const isAxiosError = res instanceof AxiosError;

    const data: AxiosResponseLog = {
      status: isAxiosError ? 500 : res.status,
      url: res.config.url,
      baseUrl: this.config.baseURL ?? "localhost",
      method: res.config.method,
      latency: isAxiosError
        ? -1
        : (res.headers["request-duration"] ?? -1),
      contentType: isAxiosError
        ? "application/json"
        : res.headers["content-type"]?.split(";")[0],
      contentLength: isAxiosError
        ? "-1"
        : (res.headers.getContentLength() ?? "-1"),
      data: isAxiosError ? res : res.data,
    };

    if (!isAxiosError && res.config.responseType === "arraybuffer") {
      const downloadFileLength = res?.data?.byteLength || 0;

      data.downloadSpeed = Math.round(
        (downloadFileLength || 0) / 1024 / (data.latency / 1000),
      ); // KB/s
    }

    // Save request to database
    createRequest({
      ...data,
      data: data.status !== 200 ? data.data : undefined,
    });

    // Log request to console
    logExternalRequest(data);
  }

  private createUrl(endpoint: string): string {
    return `${this.config.baseURL}/${endpoint}`;
  }

  private formConfig(config: AxiosRequestConfig = {}) {
    return { ...this.config, ...config };
  }

  private attachParams(
    url: string,
    params: Record<string, string> | undefined,
  ): string {
    const formedSearchParams = new URLSearchParams(params ?? {});
    const formedQuery = formedSearchParams.toString()
      ? `?${formedSearchParams.toString()}`
      : "";

    return `${url}${formedQuery}`;
  }
}
