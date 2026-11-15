import { storageService } from "@observatory/storage";

import { MirrorsService } from "./service/mirrors.service";

export { MirrorsService };

export const mirrorsService = new MirrorsService(storageService);
