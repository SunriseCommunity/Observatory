import { createRequest } from '../../../database/models/requests';
import { logExternalRequest } from '../../../utils/logger';
import { AxiosResponseLog, BaseApiOptions } from './base-api.types';
import { Axios, AxiosError, AxiosRequestConfig } from 'axios';

export class BaseApi {
    constructor(
        private readonly axios: Axios,
        private readonly config: AxiosRequestConfig,
    ) {
        axios.interceptors.request.use((config) => {
            config.headers['request-startTime'] = new Date().getTime();
            return config;
        });

        axios.interceptors.response.use((response) => {
            const currentTime = new Date().getTime();
            const startTime = response.config.headers['request-startTime'];
            response.headers['request-duration'] = currentTime - startTime;
            return response;
        });
    }

    public async get<
        Q,
        B extends Record<string, never> = Record<string, never>,
    >(endpoint: string, options?: BaseApiOptions<B>) {
        const formedUrl = this.createUrl(endpoint);
        const formedUrlWithAttachedParams = this.attachParams(
            formedUrl,
            options?.body,
        );
        const formedConfig = this.formConfig(options?.config);

        try {
            const res = await this.axios.get<Q>(
                formedUrlWithAttachedParams,
                formedConfig,
            );

            this.handleResponse(res);
            return res;
        } catch (e: any) {
            this.handleResponse(e.response || e);
            return e.response || e;
        }
    }

    public async post<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        try {
            const res = await this.axios.post<Q>(
                formedUrl,
                options?.body,
                formedConfig,
            );

            this.handleResponse(res);
            return res;
        } catch (e: any) {
            this.handleResponse(e.response || e);
            return e.response || e;
        }
    }

    public async put<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        try {
            const res = await this.axios.put<Q>(
                formedUrl,
                options?.body,
                formedConfig,
            );

            this.handleResponse(res);
            return res;
        } catch (e: any) {
            this.handleResponse(e.response || e);
            return e.response || e;
        }
    }

    public async patch<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        try {
            const res = await this.axios.patch<Q>(
                formedUrl,
                options?.body,
                formedConfig,
            );

            this.handleResponse(res);
            return res;
        } catch (e: any) {
            this.handleResponse(e.response || e);
            return e.response || e;
        }
    }

    public async delete<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        try {
            const res = await this.axios.delete<Q>(formedUrl, formedConfig);

            this.handleResponse(res);
            return res;
        } catch (e: any) {
            this.handleResponse(e.response || e);
            return e.response || e;
        }
    }

    public get axiosConfig() {
        return this.config;
    }

    private handleResponse(res: any) {
        if (!res) return;
        const isAxiosError = res instanceof AxiosError;

        const data: AxiosResponseLog = {
            status: isAxiosError ? 500 : res.status,
            url: res.config.url,
            baseUrl: this.config.baseURL ?? 'localhost',
            method: res.config.method,
            latency: isAxiosError
                ? -1
                : (res.headers['request-duration'] ?? -1),
            contentType: isAxiosError
                ? 'application/json'
                : res.headers['content-type']?.split(';')[0],
            contentLength: isAxiosError
                ? '-1'
                : (res.headers.getContentLength() ?? '-1'),
            data: isAxiosError ? res : res.data,
        };

        if (!isAxiosError && res.config.responseType === 'arraybuffer') {
            data.downloadSpeed = Math.round(
                (res.data.byteLength || 0) / 1024 / (data.latency / 1000),
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
        return { ...this.config, ...(config ?? {}) };
    }

    private attachParams(
        url: string,
        params: Record<string, string> | undefined,
    ): string {
        const formedSearchParams = new URLSearchParams(params ?? {});
        const formedQuery = formedSearchParams.toString()
            ? `?${formedSearchParams.toString()}`
            : '';

        return `${url}${formedQuery}`;
    }
}
