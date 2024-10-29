import { createPinoLogger, pino } from "@bogeychan/elysia-logger";
import { loggerOptions } from "../setup";
import { AxiosResponse } from "axios";
import config from "../config";

const logger = createPinoLogger({
  ...loggerOptions,
});

export const logExternalRequest = (
  baseUrl: string,
  url: string,
  method: string,
  response: AxiosResponse
) => {
  logger.info({
    data: {
      baseUrl,
      url,
      method,
      status: response.status,
      data: config.IsDebug ? response.data : undefined,
    },
  });
};

// TODO: Add more loggers here

export default logger;
