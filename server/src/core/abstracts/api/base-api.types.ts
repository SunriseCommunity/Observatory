import { AxiosRequestConfig } from 'axios';

export interface BaseApiOptions<B extends Record<string, any>> {
    body?: B;
    config?: AxiosRequestConfig;
}
