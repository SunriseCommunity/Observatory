import { AxiosRequestConfig } from "axios";

export interface BaseApiOptions<B extends Record<string, never>> {
  body?: B;
  config?: AxiosRequestConfig;
}


