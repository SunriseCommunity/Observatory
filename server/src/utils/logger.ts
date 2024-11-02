import { createPinoLogger } from '@bogeychan/elysia-logger';
import { loggerOptions } from '../setup';
import config from '../config';
import { AxiosResponseLog } from '../core/abstracts/api/base-api.types';

const logger = createPinoLogger({
    ...loggerOptions,
});

export const logExternalRequest = (data: AxiosResponseLog) => {
    const level =
        data.status < 400 ? 'info' : data.status < 500 ? 'warn' : 'error';

    logger[level]({
        axios: {
            ...data,
            data: config.IsDebug || level != 'info' ? data : undefined,
        },
    });
};

// TODO: Add more loggers here

export default logger;
