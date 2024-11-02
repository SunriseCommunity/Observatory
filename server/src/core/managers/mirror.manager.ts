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
    weight: 50,
    requests: {
        processed: 0,
        failed: 0,
        total: 0,
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

        const client = this._getClient(criteria);
        const result = await client.getBeatmapSet(ctx);

        return result.result;
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

        const client = this._getClient(criteria);
        const result = await client.getBeatmap(ctx);

        return result.result;
    }

    async downloadBeatmapSet(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ArrayBuffer | null> {
        const criteria = ctx.noVideo
            ? ClientAbilities.DownloadBeatmapSetByIdNoVideo
            : ClientAbilities.DownloadBeatmapSetById;

        const client = this._getClient(criteria);
        const result = await client.downloadBeatmapSet(ctx);

        return result.result;
    }

    private _getClient(criteria: ClientAbilities) {
        const clients = this.clients.filter((client) =>
            client.client.clientConfig.abilities.includes(criteria),
        );

        if (!clients.length) {
            throw new Error(`No clients found with ability ${criteria}`);
        }

        // TODO: Add logic to determine which client to use
        // Aaaand also go to the next client if the current one fails

        const randomNum = Math.random() * clients.length;

        return clients[Math.floor(randomNum)].client;
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorManager: ${message}`);
    }
}
