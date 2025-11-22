import { Elysia, StatusMap } from 'elysia';
import { cors } from '@elysiajs/cors';
import swagger, { ElysiaSwaggerConfig } from '@elysiajs/swagger';
import { logger } from '@bogeychan/elysia-logger';
import serverTiming from '@elysiajs/server-timing';
import { autoload } from 'elysia-autoload';
import { ip } from 'elysia-ip';
import { rateLimit } from 'elysia-rate-limit';
import config from './config';
import { requestID } from 'elysia-requestid';

const swaggerOptions: ElysiaSwaggerConfig<'/docs'> = {
    documentation: {
        info: {
            title: Bun.env.npm_package_name ?? 'Observatory API',
            version: Bun.env.npm_package_version ?? '1.0.0',
            description:
                Bun.env.npm_package_description ?? 'API for Observatory',
        },
    },
    exclude: ['/'],
    path: '/docs',
};

const loggerOptions = {
    transport: {
        targets: [
            ...(config.IsAutomatedTesting
                ? []
                : [
                      {
                          target: 'pino-pretty',
                          options: {
                              colorize: true,
                          },
                      },
                  ]),
            ...(config.LOKI_HOST
                ? [
                      {
                          target: 'pino-loki',
                          options: {
                              batching: false,
                              labels: {
                                  app:
                                      process.env.npm_package_name || 'unknown',
                                  namespace:
                                      process.env.NODE_ENV || 'development',
                              },
                              host: config.LOKI_HOST,
                          },
                      },
                  ]
                : []),
        ],
    },
};

async function setup() {
    return new Elysia({ name: 'setup' })
        .use(cors())
        .use(ip())
        .use(requestID())
        .use(
            rateLimit({
                max: config.RATELIMIT_CALLS_PER_WINDOW,
                duration: config.RATELIMIT_TIME_WINDOW,
                skip(req) {
                    const token = req.headers.get('Authorization');
                    const validToken = config.IGNORE_RATELIMIT_KEY;

                    if (validToken && token === validToken) {
                        return true;
                    }

                    return false;
                },
            }),
        )
        .use(serverTiming({ enabled: !config.IsProduction }))
        .use(
            logger({
                ...loggerOptions,
                autoLogging: true,
                customProps(ctx: any) {
                    const statusCode = (ctx.code ?? '')
                        .replace(/_/g, ' ')
                        .replace(/[A-Z]/g, (letter: string) =>
                            letter.toLowerCase(),
                        )
                        .replace(/(^\w{1})|(\s+\w{1})/g, (letter: string) =>
                            letter.toUpperCase(),
                        );

                    return {
                        params: ctx.params,
                        query: ctx.query,
                        requestId: ctx.set.headers['X-Request-ID'],
                        res: {
                            statusCode:
                                StatusMap[
                                    statusCode as keyof typeof StatusMap
                                ] ??
                                ctx.set.status ??
                                500,
                        },
                    };
                },
            }),
        )
        .use(await autoload({ dir: `${__dirname}/controllers` }))
        .use(swagger(swaggerOptions))
        .get('/favicon.ico', () => Bun.file('./server/public/favicon.ico'));
}

export default setup;
export { loggerOptions };
