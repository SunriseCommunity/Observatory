import {
    MirrorClient,
    GetBeatmapSetOptions,
    ResultWithStatus,
    ClientAbilities,
    GetBeatmapOptions,
    DownloadBeatmapSetOptions,
    SearchBeatmapsets,
    GetBeatmapsOptions,
    DownloadOsuBeatmap,
} from '../../abstracts/client/base-client.types';
import { DirectClient, BanchoClient } from '../../domains';
import { MirrorsManagerService } from './mirrors-manager.service';
import config from '../../../config';
import logger from '../../../utils/logger';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { MinoClient } from '../../domains/catboy.best/mino.client';
import { GatariClient } from '../../domains/gatari.pw/gatari.client';
import { NerinyanClient } from '../../domains/nerinyan.moe/nerinyan.client';
import { getRequestsCount } from '../../../database/models/requests';
import { getUTCDate } from '../../../utils/date';
import { OsulabsClient } from '../../domains/beatmaps.download/osulabs.client';

const DEFAULT_CLIENT_PROPS = {
    weights: {
        download: 0,
        API: 0,
        failrate: 0,
    },
};

export class MirrorsManager {
    private readonly managerService: MirrorsManagerService;

    private readonly clients: MirrorClient[] = [];

    constructor() {
        this.clients = [];

        if (!config.MirrorsToIgnore.includes('direct')) {
            const directClient = new DirectClient();

            this.clients.push({
                client: directClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('mino')) {
            const minoClient = new MinoClient();

            this.clients.push({
                client: minoClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        if (!config.MirrorsToIgnore.includes('osulabs')) {
            const osulabsClient = new OsulabsClient();

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
        ctx: SearchBeatmapsets,
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
        const applicationStartTime =
            getUTCDate().getTime() - Bun.nanoseconds() / 1000000;

        const successfulStatusCodes = [200, 404];
        const failedStatusCodes = [500, 502, 503, 504, 429];

        return {
            activeMirrors: await Promise.all(
                this.clients.map(async (c) => {
                    return {
                        name: c.client.constructor.name,
                        url: c.client.clientConfig.baseUrl,
                        lifetime: {
                            total: await getRequestsCount(
                                c.client.clientConfig.baseUrl,
                            ),
                            succsssful: await getRequestsCount(
                                c.client.clientConfig.baseUrl,
                                undefined,
                                successfulStatusCodes,
                            ),
                            failed: await getRequestsCount(
                                c.client.clientConfig.baseUrl,
                                undefined,
                                failedStatusCodes,
                            ),
                        },
                        session: {
                            total: await getRequestsCount(
                                c.client.clientConfig.baseUrl,
                                applicationStartTime,
                            ),
                            succsssful: await getRequestsCount(
                                c.client.clientConfig.baseUrl,
                                applicationStartTime,
                                successfulStatusCodes,
                            ),
                            failed: await getRequestsCount(
                                c.client.clientConfig.baseUrl,
                                applicationStartTime,
                                failedStatusCodes,
                            ),
                        },
                    };
                }),
            ),
            activeMethods: this.clients
                .map((client) => client.client.clientConfig.abilities)
                .flat()
                .filter((value, index, self) => self.indexOf(value) === index)
                .map((a) => ClientAbilities[a]),
        };
    }

    private async useMirror<T>(
        ctx:
            | DownloadBeatmapSetOptions
            | GetBeatmapOptions
            | GetBeatmapSetOptions
            | SearchBeatmapsets
            | GetBeatmapsOptions
            | DownloadOsuBeatmap,
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
        return { result: null, status: 500 };
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
        const rateLimitWeight = remaining / limit;

        const isDownload = [
            ClientAbilities.DownloadBeatmapSetById,
            ClientAbilities.DownloadBeatmapSetByIdNoVideo,
            ClientAbilities.DownloadOsuBeatmap,
        ].includes(ability);

        const latencyWeight = isDownload
            ? client.weights.download
            : client.weights.API;

        return rateLimitWeight * latencyWeight * (1 - client.weights.failrate);
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorsManager: ${message}`);
    }
}
