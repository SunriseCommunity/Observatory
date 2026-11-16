import type { AxiosRequestConfig } from "axios";

export interface BaseApiOptions<B = unknown> {
  body?: B;
  config?: AxiosRequestConfig;
}
