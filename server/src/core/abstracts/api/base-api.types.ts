import { AxiosRequestConfig } from 'axios';

export interface BaseApiOptions<B extends Record<string, any>> {
    body?: B;
    config?: AxiosRequestConfig;
}

export type AxiosResponseLog = {
    status: number;
    url: string;
    baseUrl: string;
    method: string;
    latency: number;
    contentType: string;
    contentLength: string;
    downloadSpeed?: number;
    data?: any;
};
