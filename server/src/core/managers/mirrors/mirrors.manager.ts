import {
    MirrorClient,
    GetBeatmapSetOptions,
    ResultWithStatus,
    ClientAbilities,
    GetBeatmapOptions,
    DownloadBeatmapSetOptions,
} from '../../abstracts/client/base-client.types';
import { DirectClient, BanchoClient } from '../../domains';
import { MirrorsManagerService } from './mirrors-manager.service';
import config from '../../../config';
import logger from '../../../utils/logger';
import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { MinoClient } from '../../domains/catboy.best/mino.client';
import { GatariClient } from '../../domains/gatari.pw/gatari.client';
import { NerinyanClient } from '../../domains/nerinyan.moe/nerinyan.client';

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
        const directClient = new DirectClient();
        const gatariClient = new GatariClient();
        const minoClient = new MinoClient();
        const nerinyanClient = new NerinyanClient();

        const banchoClient = new BanchoClient();

        this.clients = [
            {
                client: directClient,
                ...DEFAULT_CLIENT_PROPS,
            },
            {
                client: minoClient,
                ...DEFAULT_CLIENT_PROPS,
            },
            {
                client: gatariClient,
                ...DEFAULT_CLIENT_PROPS,
            },
            {
                client: nerinyanClient,
                ...DEFAULT_CLIENT_PROPS,
            },
        ];

        if (config.UseBancho) {
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

    private async useMirror<T>(
        ctx:
            | DownloadBeatmapSetOptions
            | GetBeatmapOptions
            | GetBeatmapSetOptions,
        criteria: ClientAbilities,
        action: keyof MirrorClient['client'],
    ): Promise<ResultWithStatus<T>> {
        const usedClients: MirrorClient[] = [];
        for (const _ of this.clients) {
            const client = this.getClient(criteria, usedClients);
            if (!client) return { result: null, status: 500 };

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
        let bestWeight = 0;

        for (const client of clients) {
            const weight = this.getClientWeight(client, criteria);

            if (weight > bestWeight) {
                bestWeight = weight;
                bestClient = client;
            }
        }

        if (bestWeight === 0 || !bestClient) {
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
