import {
    MirrorClient,
    GetBeatmapSetOptions,
    ResultWithStatus,
    ClientAbilities,
    GetBeatmapOptions,
    DownloadBeatmapSetOptions,
    SearchBeatmapsetsOptions,
    GetBeatmapsOptions,
    DownloadOsuBeatmap,
    GetBeatmapsetsByBeatmapIdsOptions,
} from '../../abstracts/client/base-client.types';
import { DirectClient, BanchoClient } from '../../domains';
import { MirrorsManagerService } from './mirrors-manager.service';
import config from '../../../config';
import logger from '../../../utils/logger';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { MinoClient } from '../../domains/catboy.best/mino.client';
import { GatariClient } from '../../domains/gatari.pw/gatari.client';
import { NerinyanClient } from '../../domains/nerinyan.moe/nerinyan.client';
import {
    getMirrorsRequestsCountForStats,
    getRequestsCount,
} from '../../../database/models/requests';
import { getUTCDate } from '../../../utils/date';
import { OsulabsClient } from '../../domains/beatmaps.download/osulabs.client';
import { StorageManager } from '../storage/storage.manager';
import { TimeRange } from '../../../types/stats';
import {
    getMirrorsRequestsQueryData,
    TIME_RANGES_FOR_MIRRORS_STATS,
} from '../../../utils/mirrors-stats';

const DEFAULT_CLIENT_PROPS = {
    weights: {
        download: 0,
        API: 0,
        failrate: 0,
    },
};

export class MirrorsManager {
    private readonly managerService: MirrorsManagerService;
    private readonly storageManager: StorageManager;

    private readonly clients: MirrorClient[] = [];

    constructor(storageManager: StorageManager) {
        this.clients = [];

        this.storageManager = storageManager;

        if (!config.MirrorsToIgnore.includes('direct')) {
            const directClient = new DirectClient();

            this.clients.push({
                client: directClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('mino')) {
            const minoClient = new MinoClient(storageManager);

            this.clients.push({
                client: minoClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('osulabs')) {
            const osulabsClient = new OsulabsClient(storageManager);

            this.clients.push({
                client: osulabsClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('gatari')) {
            const gatariClient = new GatariClient();

            this.clients.push({
                client: gatariClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('nerinyan')) {
            const nerinyanClient = new NerinyanClient();

            this.clients.push({
                client: nerinyanClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('bancho') && config.UseBancho) {
            const banchoClient = new BanchoClient();

            this.clients.push({
                client: banchoClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        this.managerService = new MirrorsManagerService(this.clients);

        this.managerService.fetchMirrorsData().then(() => {
            this.log('Initialized');
        });
    }

    async getBeatmapSet(
        ctx: GetBeatmapSetOptions,
    ): Promise<ResultWithStatus<Beatmapset>> {
        if (!ctx.beatmapSetId) {
            throw new Error('beatmapSetId is required to fetch beatmap set');
        }

        const criteria = ClientAbilities.GetBeatmapSetById;

        return await this.useMirror<Beatmapset>(ctx, criteria, 'getBeatmapSet');
    }

    async getBeatmap(
        ctx: GetBeatmapOptions,
    ): Promise<ResultWithStatus<Beatmap>> {
        if (!ctx.beatmapId && !ctx.beatmapHash) {
            throw new Error('Either beatmapId or beatmapHash is required');
        }

        let criteria: ClientAbilities;
        if (ctx.beatmapId) {
            criteria = ClientAbilities.GetBeatmapById;
        } else {
            criteria = ClientAbilities.GetBeatmapByHash;
        }

        return await this.useMirror<Beatmap>(ctx, criteria, 'getBeatmap');
    }

    async searchBeatmapsets(
        ctx: SearchBeatmapsetsOptions,
    ): Promise<ResultWithStatus<Beatmapset[]>> {
        const criteria = ClientAbilities.SearchBeatmapsets;

        return await this.useMirror<Beatmapset[]>(
            ctx,
            criteria,
            'searchBeatmapsets',
        );
    }

    async getBeatmaps(
        ctx: GetBeatmapsOptions,
    ): Promise<ResultWithStatus<Beatmap[]>> {
        const { ids } = ctx;

        if (!ids || ids.length === 0) {
            throw new Error('ids is required to fetch beatmaps');
        }

        const criteria = ClientAbilities.GetBeatmaps;

        return await this.useMirror<Beatmap[]>(ctx, criteria, 'getBeatmaps');
    }

    async getBeatmapsetsByBeatmapIds(
        ctx: GetBeatmapsetsByBeatmapIdsOptions,
    ): Promise<ResultWithStatus<Beatmapset[]>> {
        const { beatmapIds } = ctx;

        if (!beatmapIds || beatmapIds.length === 0) {
            throw new Error('beatmapIds is required to fetch beatmapsets');
        }

        const criteria = ClientAbilities.GetBeatmapsetsByBeatmapIds;

        return await this.useMirror<Beatmapset[]>(
            ctx,
            criteria,
            'getBeatmapsetsByBeatmapIds',
        );
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ResultWithStatus<ArrayBuffer>> {
        if (!ctx.beatmapSetId) {
            throw new Error('beatmapSetId is required to download beatmap set');
        }

        let criteria: ClientAbilities;
        if (ctx.noVideo) {
            criteria = ClientAbilities.DownloadBeatmapSetByIdNoVideo;
        } else {
            criteria = ClientAbilities.DownloadBeatmapSetById;
        }

        return await this.useMirror<ArrayBuffer>(
            ctx,
            criteria,
            'downloadBeatmapSet',
        );
    }

    async downloadOsuBeatmap(
        ctx: DownloadOsuBeatmap,
    ): Promise<ResultWithStatus<ArrayBuffer>> {
        const criteria = ClientAbilities.DownloadOsuBeatmap;

        return await this.useMirror<ArrayBuffer>(
            ctx,
            criteria,
            'downloadOsuBeatmap',
        );
    }

    async getMirrorsStatistics() {
        const data = await getMirrorsRequestsCountForStats(
            getMirrorsRequestsQueryData(this.clients),
        );

        const dataMap = new Map<string, number>();
        for (const item of data) {
            const statusKey =
                item.statuscodes === null
                    ? 'null'
                    : item.statuscodes.includes(200)
                      ? 'success'
                      : item.statuscodes.includes(500)
                        ? 'fail'
                        : 'other';
            const key = `${item.name}|${item.createdafter}|${statusKey}`;
            dataMap.set(key, item.count);
        }

        return {
            activeMirrors: await Promise.all(
                this.clients.map(async (c) => {
                    const baseUrl = c.client.clientConfig.baseUrl;
                    const stats = Object.fromEntries(
                        TIME_RANGES_FOR_MIRRORS_STATS.map(({ name, time }) => [
                            name,
                            {
                                total: Number(
                                    dataMap.get(`${baseUrl}|${time}|null`) || 0,
                                ),
                                successful: Number(
                                    dataMap.get(`${baseUrl}|${time}|success`) ||
                                        0,
                                ),
                                failed: Number(
                                    dataMap.get(`${baseUrl}|${time}|fail`) || 0,
                                ),
                            },
                        ]),
                    );

                    return {
                        name: c.client.constructor.name,
                        url: baseUrl,
                        onCooldownUntil: c.client.onCooldownUntil(),
                        rateLimit: c.client.getCapacities(),
                        requests: stats,
                    };
                }),
            ),
            rateLimitsTotal: this.clients.reduce(
                (acc, c) => {
                    const clientCapacities = c.client.getCapacities();

                    for (const capacity of clientCapacities) {
                        if (!acc[capacity.ability]) {
                            acc[capacity.ability] = { total: 0, remaining: 0 };
                        }
                        acc[capacity.ability].total += capacity.limit;
                        acc[capacity.ability].remaining += capacity.remaining;
                    }

                    return acc;
                },
                {} as Record<string, { total: number; remaining: number }>,
            ),
        };
    }

    private async useMirror<T>(
        ctx:
            | DownloadBeatmapSetOptions
            | GetBeatmapOptions
            | GetBeatmapSetOptions
            | SearchBeatmapsetsOptions
            | GetBeatmapsOptions
            | DownloadOsuBeatmap
            | GetBeatmapsetsByBeatmapIdsOptions,
        criteria: ClientAbilities,
        action: keyof MirrorClient['client'],
    ): Promise<ResultWithStatus<T>> {
        const usedClients: MirrorClient[] = [];
        for (const _ of this.clients) {
            const client = this.getClient(criteria, usedClients);
            if (!client) return { result: null, status: 501 };

            const result = await (client.client[action] as Function)(ctx);
            if (result.result || result.status === 404) return result;

            usedClients.push(client);
        }
        return { result: null, status: 502 };
    }

    private getClient(
        criteria: ClientAbilities,
        ignore?: MirrorClient[],
    ): MirrorClient | null {
        const clients = this.clients
            .filter((client) =>
                client.client.clientConfig.abilities.includes(criteria),
            )
            .filter((client) => !ignore || !ignore.includes(client));

        const client = this.getClientByWeight(criteria, clients);

        return client;
    }

    private getClientByWeight(
        criteria: ClientAbilities,
        clients: MirrorClient[],
    ): MirrorClient | null {
        let bestClient: MirrorClient | null = null;
        let bestWeight = -1;

        for (const client of clients) {
            const weight = this.getClientWeight(client, criteria);

            if (weight > bestWeight) {
                bestWeight = weight;
                bestClient = client;
            }
        }

        if (bestWeight === -1 || !bestClient) {
            return null;
        }

        return bestClient;
    }

    private getClientWeight(client: MirrorClient, ability: ClientAbilities) {
        const { limit, remaining } = client.client.getCapacity(ability);

        const percentageWeight = remaining / limit;
        const capacityBonus = Math.log10(remaining + 1);
        const rateLimitWeight = percentageWeight * capacityBonus;

        const isDownload = [
            ClientAbilities.DownloadBeatmapSetById,
            ClientAbilities.DownloadBeatmapSetByIdNoVideo,
            ClientAbilities.DownloadOsuBeatmap,
        ].includes(ability);

        const latencyWeight = isDownload
            ? client.weights.download
            : client.weights.API;

        return (
            Math.max(0.00000001, rateLimitWeight) *
            Math.max(0.00000001, latencyWeight) *
            Math.max(0.00000001, 1 - client.weights.failrate)
        );
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorsManager: ${message}`);
    }
}
