import {
    ClientAbilities,
    DownloadBeatmapSetOptions,
    GetBeatmapOptions,
    GetBeatmapSetOptions,
    MirrorClient,
} from '../abstracts/client/base-client.types';
import { Beatmap, Beatmapset } from '../../types/beatmap';
import { DirectClient, BanchoClient } from '../domains/index';

import logger from '../../utils/logger';
import { MirrorManagerService } from './mirror-manager.service';
import config from '../../config';

const DEFAULT_CLIENT_PROPS = {
    weights: {
        download: 0,
        API: 0,
        failrate: 0,
    },
};

export class MirrorManager {
    private readonly managerService: MirrorManagerService;

    private readonly clients: MirrorClient[] = [];

    constructor() {
        const directClient = new DirectClient();
        const banchoClient = new BanchoClient();

        this.clients = [
            {
                client: directClient,
                ...DEFAULT_CLIENT_PROPS,
            },
        ];

        if (config.UseBancho) {
            this.clients.push({
                client: banchoClient,
                ...DEFAULT_CLIENT_PROPS,
            });
        }

        this.managerService = new MirrorManagerService(this.clients);

        this.managerService.fetchMirrorsData().then(() => {
            this.log('Initialized');
        });
    }

    async getBeatmapSet(ctx: GetBeatmapSetOptions): Promise<Beatmapset | null> {
        if (!ctx.beatmapSetId && !ctx.beatmapHash && !ctx.beatmapId) {
            throw new Error(
                'Either beatmapSetId, beatmapHash or beatmapId is required',
            );
        }

        const criteria = ctx.beatmapSetId
            ? ClientAbilities.GetBeatmapSetById
            : ctx.beatmapHash
              ? ClientAbilities.GetBeatmapSetByBeatmapHash
              : ClientAbilities.GetBeatmapSetByBeatmapId;

        const client = this.getClient(criteria);
        const result = await client?.client.getBeatmapSet(ctx);

        return result?.result || null;
    }

    async getBeatmap(ctx: GetBeatmapOptions): Promise<Beatmap | null> {
        if (!ctx.beatmapId && !ctx.beatmapHash) {
            throw new Error('Either beatmapId or beatmapHash is required');
        }

        const criteria = ctx.beatmapId
            ? ClientAbilities.GetBeatmapById
            : ctx.beatmapHash
              ? ClientAbilities.GetBeatmapByHash
              : ClientAbilities.GetBeatmapBySetId;

        const client = this.getClient(criteria);
        const result = await client?.client.getBeatmap(ctx);

        return result?.result || null;
    }

    // TODO: Should be more clear, is null because of no mirror or no result

    async downloadBeatmapSetCool(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ArrayBuffer | null> {
        const criteria = ctx.noVideo
            ? ClientAbilities.DownloadBeatmapSetByIdNoVideo
            : ClientAbilities.DownloadBeatmapSetById;

        const usedClients: MirrorClient[] = [];
        for (const _ of this.clients) {
            const client = this.getClient(criteria, usedClients);
            if (!client) return null;

            const result = await client.client.downloadBeatmapSet(ctx);
            if (result.result) return result.result;
            usedClients.push(client);
        }

        return null;
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
            const weight = this._getClientWeight(client, criteria);

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

    private _getClientWeight(client: MirrorClient, ability: ClientAbilities) {
        const { limit, remaining } = client.client.getCapacity(ability);
        const rateLimitWeight = remaining / limit;

        // TODO: Better enum handling
        const isDownload =
            ability === ClientAbilities.DownloadBeatmapSetById ||
            ability === ClientAbilities.DownloadBeatmapSetByIdNoVideo;

        const latencyWeight = isDownload
            ? client.weights.download
            : client.weights.API;

        return rateLimitWeight * latencyWeight * (1 - client.weights.failrate);
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorManager: ${message}`);
    }
}
