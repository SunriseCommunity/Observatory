import { beforeEach, describe, expect, it } from 'bun:test';
import { BanchoClient, DirectClient } from '../core/domains';

// @ts-ignore
import json from './data/mirror.tests.json';
import { MinoClient } from '../core/domains/catboy.best/mino.client';
import config from '../config';

describe('Mirror tests', () => {
    const banchoClient = new BanchoClient();
    const minoClient = new MinoClient();
    const directClient = new DirectClient();

    const getRandomTest = (key: string) => {
        return json.tests[key][
            Math.floor(Math.random() * json.tests[key].length)
        ];
    };

    describe('Bancho tests', () => {
        const hasClientToken =
            config.BANCHO_CLIENT_ID && config.BANCHO_CLIENT_SECRET
                ? true
                : false;

        it('Bancho: should return converted beatmap', async () => {
            if (!hasClientToken) {
                return it.skip('Bancho: should return converted beatmap', () => {});
            }

            const randomTest = getRandomTest('getBeatmapById');
            const { beatmapId } = randomTest;

            const beatmap = await banchoClient.getBeatmap({
                beatmapId,
            });

            expect(beatmap.result).toContainAllKeys(
                Object.keys(randomTest.data),
            );
        });

        it('Bancho: should return converted beatmapset', async () => {
            if (!hasClientToken) {
                return it.skip('Bancho: should return converted beatmapset', () => {});
            }

            const randomTest = getRandomTest('getBeatmapsetById');
            const { beatmapSetId } = randomTest;

            const beatmap = await banchoClient.getBeatmapSet({
                beatmapSetId,
            });

            expect(beatmap.result).toContainAllKeys(
                Object.keys(randomTest.data),
            );
        });
    });

    describe('Mino tests', () => {
        it('Mino: should return converted beatmap', async () => {
            const randomTest = getRandomTest('getBeatmapById');
            const { beatmapId } = randomTest;

            const beatmap = await minoClient.getBeatmap({
                beatmapId,
            });

            expect(beatmap.result).toContainAllKeys(
                Object.keys(randomTest.data),
            );
        });

        it('Mino: should return converted beatmapset', async () => {
            const randomTest = getRandomTest('getBeatmapsetById');
            const { beatmapSetId } = randomTest;

            const beatmap = await minoClient.getBeatmapSet({
                beatmapSetId,
            });

            expect(beatmap.result).toContainAllKeys(
                Object.keys(randomTest.data),
            );
        });

        it('Mino: should download beatmap set without video', async () => {
            const randomTest = getRandomTest('downloadBeatmapSet');
            const { beatmapSetId } = randomTest;

            const beatmap = await minoClient.downloadBeatmapSet({
                beatmapSetId,
                noVideo: true,
            });

            const expected = await Bun.file(
                `${import.meta.dir}/data/${beatmapSetId}n.osz`,
            ).arrayBuffer();

            expect(beatmap.result?.byteLength).toBeWithin(
                expected.byteLength - 1000,
                expected.byteLength + 1000,
            );
        }, 30000);

        it('Mino: should download beatmap set with video', async () => {
            const randomTest = getRandomTest('downloadBeatmapSet');
            const { beatmapSetId } = randomTest;

            const beatmap = await minoClient.downloadBeatmapSet({
                beatmapSetId,
                noVideo: false,
            });

            const expected = await Bun.file(
                `${import.meta.dir}/data/${beatmapSetId}.osz`,
            ).arrayBuffer();

            expect(beatmap.result?.byteLength).toBeWithin(
                expected.byteLength - 1000,
                expected.byteLength + 1000,
            );
        }, 30000);
    });

    describe('Direct tests', () => {
        it('Direct: should download beatmap set without video', async () => {
            const randomTest = getRandomTest('downloadBeatmapSet');
            const { beatmapSetId } = randomTest;

            const beatmap = await directClient.downloadBeatmapSet({
                beatmapSetId,
                noVideo: true,
            });

            const expected = await Bun.file(
                `${import.meta.dir}/data/${beatmapSetId}n.osz`,
            ).arrayBuffer();

            expect(beatmap.result?.byteLength).toBeWithin(
                expected.byteLength - 1000,
                expected.byteLength + 1000,
            );
        }, 30000);

        it('Direct: should download beatmap set with video', async () => {
            const randomTest = getRandomTest('downloadBeatmapSet');
            const { beatmapSetId } = randomTest;

            const beatmap = await directClient.downloadBeatmapSet({
                beatmapSetId,
                noVideo: false,
            });

            const expected = await Bun.file(
                `${import.meta.dir}/data/${beatmapSetId}.osz`,
            ).arrayBuffer();

            expect(beatmap.result?.byteLength).toBeWithin(
                expected.byteLength - 1000,
                expected.byteLength + 1000,
            );
        }, 30000);
    });
});
