import logger, { logExternalRequest } from '../../../utils/logger';
import { BaseApiOptions } from './base-api.types';
import { Axios, AxiosRequestConfig } from 'axios';

export class BaseApi {
    constructor(
        private axios: Axios,
        private config: AxiosRequestConfig,
    ) {}

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

        return await this.axios
            .get<Q>(formedUrlWithAttachedParams, formedConfig)
            .then((res) => {
                this.logResponse(res);
                return res;
            })
            .catch((e) => {
                logger.error(
                    `Failed to fetch ${formedUrlWithAttachedParams} with GET | ${e}`,
                );
                return null;
            });
    }

    public async post<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        return await this.axios
            .post<Q>(formedUrl, options?.body, formedConfig)
            .then((res) => {
                this.logResponse(res);
                return res;
            })
            .catch((e) => {
                logger.error(`Failed to fetch ${formedUrl} with POST | ${e}`);
                return null;
            });
    }

    public async put<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        return await this.axios
            .put<Q>(formedUrl, options?.body, formedConfig)
            .then((res) => {
                this.logResponse(res);
                return res;
            })
            .catch((e) => {
                logger.error(`Failed to fetch ${formedUrl} with PUT | ${e}`);
                return null;
            });
    }

    public async patch<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        return await this.axios
            .patch<Q>(formedUrl, options?.body, formedConfig)
            .then((res) => {
                this.logResponse(res);
                return res;
            })
            .catch((e) => {
                logger.error(`Failed to fetch ${formedUrl} with PATCH | ${e}`);
                return null;
            });
    }

    public async delete<Q, B extends Record<string, any>>(
        endpoint: string,
        options?: BaseApiOptions<B>,
    ) {
        const formedUrl = this.createUrl(endpoint);
        const formedConfig = this.formConfig(options?.config);

        return await this.axios
            .delete<Q>(formedUrl, formedConfig)
            .then((res) => {
                this.logResponse(res);
                return res;
            })
            .catch((e) => {
                logger.error(
                    `Failed to fetch ${formedUrl} with DELETE. | ${e}`,
                );
                return null;
            });
    }
    
    public get axiosConfig() {
        return this.config;
    }

    private logResponse(res: any) {
        logExternalRequest(
            this.config.baseURL ?? 'localhost',
            res.config.url,
            res.config.method,
            res,
        );
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
