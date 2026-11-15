import { mirrorsService } from "@observatory/mirrors";
import { storageService } from "@observatory/storage";

import { BeatmapsService } from "./service/beatmaps.service";

export { BeatmapsService };

export const beatmapsService = new BeatmapsService(storageService, mirrorsService);
