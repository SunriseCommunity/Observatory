import { faker } from "@faker-js/faker";
import { mock } from "bun:test";

import type {
  OsulabsBeatmap,
  OsulabsBeatmapset,
} from "../../src/core/domains/beatmaps.download/osulabs-client.types";
import type {
  MinoBeatmap,
  MinoBeatmapset,
} from "../../src/core/domains/catboy.best/mino-client.types";
import type { Beatmap, Beatmapset } from "../../src/types/general/beatmap";
import { GameMode } from "../../src/types/general/gameMode";
import { RankStatus } from "../../src/types/general/rankStatus";
import type { User } from "../../src/types/general/user";
import type { DeepPartial } from "../../src/types/utils";

function autoMock<T extends object>(base: DeepPartial<T>): T {
  return new Proxy(base as T, {
    get(target: any, prop: string | symbol) {
      if (prop in target) {
        return target[prop];
      }

      return mock(async (..._args: any[]) => null);
    },
  }) as unknown as T;
}

export const FakerGenerator = {
  generateOsuUser(options?: DeepPartial<User>): User {
    return autoMock<User>({
      id: faker.number.int({ min: 1, max: 1000000 }),
      username: faker.internet.username(),
      country_code: faker.location.countryCode(),
      country: {
        code: faker.location.countryCode(),
        name: faker.location.country(),
      },
      cover: {
        custom_url: null,
        id: null,
        url: "https://placehold.co/1200x300",
      },
      discord: null,
      has_supported: faker.datatype.boolean(),
      interests: null,
      is_restricted: false,
      join_date: new Date().toISOString(),
      location: null,
      max_blocks: faker.number.int({ min: 0, max: 100 }),
      max_friends: faker.number.int({ min: 0, max: 100 }),
      monthly_playcounts: [],
      occupation: null,
      previous_usernames: [],
      profile_colour: null,
      ...(options as any),
    });
  },

  generateOsulabsBeatmapset(
    options?: DeepPartial<OsulabsBeatmapset>,
  ): OsulabsBeatmapset {
    return this.generateBeatmapset({
      last_updated: Date.now() as unknown as string, // number is expected by the service
      beatmaps: options?.beatmaps ?? [
        FakerGenerator.generateOsulabsBeatmap({
          set: null,
          convert: false,
        }),
        FakerGenerator.generateOsulabsBeatmap({
          set: null,
          convert: false,
        }),
      ],
      converts: options?.converts ?? [
        FakerGenerator.generateOsulabsBeatmap({
          convert: true,
          set: null,
        }),
        FakerGenerator.generateOsulabsBeatmap({
          convert: true,
          set: null,
        }),
      ],
      ...options,
    }) as OsulabsBeatmapset;
  },

  generateOsulabsBeatmap(
    options?: DeepPartial<OsulabsBeatmap>,
  ): OsulabsBeatmap {
    return this.generateBeatmap({
      last_updated: Date.now() as unknown as string, // number is expected by the service
      ...options,
      set:
                options?.set !== undefined
                  ? options.set
                  : FakerGenerator.generateOsulabsBeatmapset({
                      beatmaps: [
                        FakerGenerator.generateOsulabsBeatmap({
                          set: null,
                        }) as any,
                        FakerGenerator.generateOsulabsBeatmap({
                          set: null,
                        }) as any,
                      ],
                      converts: [
                        FakerGenerator.generateOsulabsBeatmap({
                          convert: true,
                          set: null,
                        }) as any,
                        FakerGenerator.generateOsulabsBeatmap({
                          convert: true,
                          set: null,
                        }) as any,
                      ],
                    }),
      ...options,
    }) as OsulabsBeatmap;
  },

  generateMinoBeatmapset(
    options?: DeepPartial<MinoBeatmapset>,
  ): MinoBeatmapset {
    return this.generateBeatmapset({
      last_updated: Date.now() as unknown as string, // number is expected by the service
      beatmaps: options?.beatmaps ?? [
        FakerGenerator.generateMinoBeatmap({ convert: false }),
        FakerGenerator.generateMinoBeatmap({ convert: false }),
      ],
      converts: options?.converts ?? [
        FakerGenerator.generateMinoBeatmap({ convert: true }),
        FakerGenerator.generateMinoBeatmap({ convert: true }),
      ],
      ...options,
    }) as MinoBeatmapset;
  },

  generateMinoBeatmap(
    options?: DeepPartial<MinoBeatmap>,
  ): MinoBeatmap {
    return this.generateBeatmap({
      last_updated: Date.now() as unknown as string, // number is expected by the service
      set:
                options?.set !== undefined
                  ? options.set
                  : FakerGenerator.generateMinoBeatmapset({
                      beatmaps: [
                        FakerGenerator.generateMinoBeatmap({
                          set: null,
                        }) as any,
                        FakerGenerator.generateMinoBeatmap({
                          set: null,
                        }) as any,
                      ],
                      converts: [
                        FakerGenerator.generateMinoBeatmap({
                          convert: true,
                          set: null,
                        }) as any,
                        FakerGenerator.generateMinoBeatmap({
                          convert: true,
                          set: null,
                        }) as any,
                      ],
                    }),
      ...options,
    }) as MinoBeatmap;
  },

  generateBeatmapset(options?: DeepPartial<Beatmapset>): Beatmapset {
    return autoMock<Beatmapset>({
      id: faker.number.int({ min: 1, max: 1000000 }),
      artist: faker.music.artist(),
      artist_unicode: faker.music.artist(),
      creator: faker.internet.username(),
      creator_id: faker.number.int({ min: 1, max: 100000 }),
      beatmap_nominator_user: undefined,
      beatmaps: [
        FakerGenerator.generateBeatmap(),
        FakerGenerator.generateBeatmap(),
      ],
      converts: [
        FakerGenerator.generateBeatmap({ convert: true }),
        FakerGenerator.generateBeatmap({ convert: true }),
      ],
      last_updated: new Date().toISOString(),
      ...(options as any),
    });
  },

  generateBeatmap(options?: DeepPartial<Beatmap>): Beatmap {
    return autoMock<Beatmap>({
      id: faker.number.int({ min: 1, max: 1000000 }),
      beatmapset_id: faker.number.int({ min: 1, max: 100000 }),
      checksum: faker.string.alphanumeric(32),
      version: faker.word.adjective(),
      status: RankStatus.RANKED,
      difficulty_rating: faker.number.float({ min: 1, max: 10 }),
      total_length: faker.number.int({ min: 60, max: 600 }),
      max_combo: faker.number.int({ min: 100, max: 2000 }),
      accuracy: faker.number.float({ min: 1, max: 10 }),
      ar: faker.number.float({ min: 1, max: 10 }),
      bpm: faker.number.float({ min: 80, max: 200 }),
      convert: false,
      count_circles: faker.number.int({ min: 100, max: 1000 }),
      count_sliders: faker.number.int({ min: 50, max: 500 }),
      count_spinners: faker.number.int({ min: 0, max: 10 }),
      cs: faker.number.float({ min: 1, max: 10 }),
      deleted_at: null,
      drain: faker.number.float({ min: 1, max: 10 }),
      hit_length: faker.number.int({ min: 60, max: 600 }),
      is_scoreable: true,
      last_updated: new Date().toISOString(),
      mode_int: 0,
      mode: GameMode.OSU_STANDARD,
      ranked: 1,
      user_id: faker.number.int({ min: 1, max: 100000 }),
      ...(options as any),
    });
  },
};
