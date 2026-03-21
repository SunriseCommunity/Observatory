import Elysia from "elysia";

import { BeatmapsManager } from "../core/managers/beatmaps/beatmaps.manager";

export const BeatmapsManagerInstance = new BeatmapsManager();

export const BeatmapsManagerPlugin = new Elysia({ name: "BeatmapsManager" }).decorate(
  () => ({
    BeatmapsManagerInstance,
  }),
);
