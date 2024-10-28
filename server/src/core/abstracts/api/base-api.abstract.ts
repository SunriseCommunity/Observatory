import { logExternalRequest } from "../../../utils/logger";
import { BaseApiOptions } from "./base-api.types";
import { Axios, AxiosRequestConfig } from "axios";

export class BaseApi {
  constructor(private axios: Axios, private config: AxiosRequestConfig) {}

  public async get<Q, B extends Record<string, never> = Record<string, never>>(
    endpoint: string,
    options?: BaseApiOptions<B>
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedUrlWithAttachedParams = this.attachParams(
      formedUrl,
      options?.body
    );
    const formedConfig = this.formConfig(options?.config);

    return await this.axios
      .get<Q>(formedUrlWithAttachedParams, formedConfig)
      .then((res) => {
        logExternalRequest(
          this.config.baseURL ?? "localhost",
          formedUrlWithAttachedParams,
          "GET",
          res
        );
        return res;
      });
  }

  public async post<Q, B extends Record<string, never>>(
    endpoint: string,
    options?: BaseApiOptions<B>
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    return await this.axios
      .post<Q>(formedUrl, options?.body, formedConfig)
      .then((res) => {
        logExternalRequest(
          this.config.baseURL ?? "localhost",
          formedUrl,
          "POST",
          res
        );
        return res;
      });
  }

  public async put<Q, B extends Record<string, never>>(
    endpoint: string,
    options?: BaseApiOptions<B>
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    return await this.axios
      .put<Q>(formedUrl, options?.body, formedConfig)
      .then((res) => {
        logExternalRequest(
          this.config.baseURL ?? "localhost",
          formedUrl,
          "PUT",
          res
        );
        return res;
      });
  }

  public async patch<Q, B extends Record<string, never>>(
    endpoint: string,
    options?: BaseApiOptions<B>
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    return await this.axios
      .patch<Q>(formedUrl, options?.body, formedConfig)
      .then((res) => {
        logExternalRequest(
          this.config.baseURL ?? "localhost",
          formedUrl,
          "PATCH",
          res
        );
        return res;
      });
  }

  public async delete<Q, B extends Record<string, never>>(
    endpoint: string,
    options?: BaseApiOptions<B>
  ) {
    const formedUrl = this.createUrl(endpoint);
    const formedConfig = this.formConfig(options?.config);

    return await this.axios.delete<Q>(formedUrl, formedConfig).then((res) => {
      logExternalRequest(
        this.config.baseURL ?? "localhost",
        formedUrl,
        "DELETE",
        res
      );
      return res;
    });
  }

  private createUrl(endpoint: string): string {
    return `${this.config.baseURL}/${endpoint}`;
  }

  private formAuthorizationHeader(tokenType: string, token: string) {
    return { authorization: `${tokenType} ${token}` };
  }

  private formConfig(config: AxiosRequestConfig = {}) {
    return { ...this.config, ...(config ?? {}) };
  }

  private attachParams(
    url: string,
    params: Record<string, string> | undefined
  ): string {
    const formedSearchParams = new URLSearchParams(params ?? {});
    const formedQuery = formedSearchParams.toString()
      ? `?${formedSearchParams.toString()}`
      : "";

    return `${url}${formedQuery}`;
  }
}
