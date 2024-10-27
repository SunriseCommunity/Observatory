import { createPinoLogger } from "@bogeychan/elysia-logger";
import { loggerOptions } from "../setup";

const logger = createPinoLogger(loggerOptions);

export default logger;
