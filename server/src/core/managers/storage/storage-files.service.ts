import {
    createBeatmapsetFile,
    deleteBeatmapsetsFiles,
    getBeatmapSetFile,
    getUnvalidBeatmapSetsFiles,
} from '../../../database/models/beatmapsetFile';
import { getUTCDate } from '../../../utils/date';
import { DownloadBeatmapSetOptions } from '../../abstracts/client/base-client.types';
import { StorageCacheService } from './storage-cache.service';
import { unlink } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import logger from '../../../utils/logger';

export class StorageFilesService {
    private readonly dataPath = 'data';
    private readonly videoFormats = ['avi', 'flv', 'mp4', 'm4v'];

    private readonly cacheService: StorageCacheService;

    constructor(cacheService: StorageCacheService) {
        this.cacheService = cacheService;

        setInterval(
            () => {
                this.clearOldBeatmaps();
            },
            1000 * 60 * 30,
        ); // 30 minutes

        this.clearOldBeatmaps();

        this.log('Initialized');
    }

    async insertBeatmapsetFile(
        file: ArrayBuffer | null,
        ctx: DownloadBeatmapSetOptions,
    ) {
        if (!file) {
            await this.cacheService.insertEmptyBeatmapsetFile(ctx);
            return;
        }

        const path = await this.saveFile(
            file,
            `${ctx.beatmapSetId}${ctx.noVideo ? 'n' : ''}.osz`,
        );

        if (ctx.noVideo !== true) {
            this.removeIfExists(`${this.dataPath}/${ctx.beatmapSetId}n.osz`);
        }

        const beatmapsetFile = await createBeatmapsetFile({
            id: ctx.beatmapSetId,
            noVideo: ctx.noVideo || false,
            path,
            validUntil: new Date(
                getUTCDate().getTime() + 1000 * 60 * 60 * 24,
            ).toISOString(),
        });

        await this.cacheService.insertBeatmapsetFile(ctx, beatmapsetFile);
    }

    async getBeatmapsetFile(
        ctx: DownloadBeatmapSetOptions,
    ): Promise<ArrayBuffer | undefined | null> {
        let data = await this.cacheService.getBeatmapSetFile(ctx);

        if (data === undefined) {
            data = await getBeatmapSetFile(ctx);
        } else if (data === null) {
            return null;
        }

        // Return if we we don't have the file or the file is marked as no video,
        // which we can't serve to request with noVideo set to false (or undefined)
        if (!data || (ctx.noVideo !== true && data.noVideo)) {
            return undefined;
        }

        await this.cacheService.insertBeatmapsetFile(ctx, data);

        const { path } = data;

        const isFileExists = await this.isFileExists(path);

        if (!isFileExists) {
            return undefined;
        }

        return this.getZippedFile(path, { noVideo: ctx.noVideo || false });
    }

    private async getZippedFile(path: string, ctx: { noVideo: boolean }) {
        if (
            (path.endsWith('n.osz') && ctx.noVideo) ||
            (!path.endsWith('n.osz') && !ctx.noVideo)
        ) {
            return await this.readFile(path);
        }

        const shadowCopyPath = `${path}.${crypto.randomUUID()}.temp`;

        const osz = new AdmZip(path);
        const files = osz.getEntries();

        for (const file of files) {
            const isVideo = this.videoFormats.some((format) =>
                file.entryName.endsWith(format),
            );

            if (isVideo) {
                osz.deleteFile(file);
            }
        }

        osz.writeZip(shadowCopyPath);

        const file = await this.readFile(shadowCopyPath);

        this.removeIfExists(shadowCopyPath);

        return file;
    }

    private async readFile(path: string): Promise<ArrayBuffer> {
        return await Bun.file(path).arrayBuffer();
    }

    private async isFileExists(path: string) {
        return await Bun.file(path).exists();
    }

    private async removeIfExists(path: string) {
        const isFileExists = await this.isFileExists(path);

        if (isFileExists) {
            await unlink(path);
        }
    }

    private async saveFile(
        file: ArrayBuffer,
        fileName: string,
    ): Promise<string> {
        const path = `${this.dataPath}/${fileName}`;
        await Bun.write(path, file);
        return path;
    }

    private async clearOldBeatmaps() {
        const forRemoval = await getUnvalidBeatmapSetsFiles();

        if (!forRemoval) {
            this.log('Nothing to remove. Skip cleaning.');
            return;
        }

        for (const beatmapset of forRemoval) {
            this.log(`Removing "${beatmapset.path}" ...`, 'warn');

            await this.removeIfExists(beatmapset.path);
        }

        await deleteBeatmapsetsFiles(forRemoval);

        this.log('Cleaning is finished!');
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`StorageFilesSerivce: ${message}`);
    }
}
