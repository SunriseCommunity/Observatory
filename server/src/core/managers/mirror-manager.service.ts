import {
    createBenchmark,
    getBenchmarkByMirrorId,
} from '../../database/models/benchmarks';
import {
    createMirror,
    getMirrorByUrl,
    getMirrors,
    updateMirror,
} from '../../database/models/mirrors';
import { Benchmark, Mirror } from '../../database/schema';
import { MirrorClient } from '../../types/manager';
import logger from '../../utils/logger';
import { CompareService } from '../services/compare.service';

export class MirrorManagerService {
    private readonly clients: MirrorClient[];
    private readonly compareService: CompareService;

    constructor(clients: MirrorClient[]) {
        this.compareService = new CompareService();
        this.clients = clients;

        setInterval(
            () => {
                this.saveMirrorsData();
            },
            1000 * 60 * 15,
        ); // 15 minutes

        this.log('Initialized');
    }

    public async saveMirrorsData(): Promise<void> {
        for (const client of this.clients) {
            const dbClient = await getMirrorByUrl(
                client.client.clientConfig.baseUrl,
            );

            if (!dbClient) {
                this.log(
                    `Mirror ${client.client.clientConfig.baseUrl} not found in database, is the database corrupted?`,
                    'error',
                );
                return;
            }

            await updateMirror(dbClient.mirrorId, {
                requestsProcessed: client.requests.processed,
                requestsFailed: client.requests.failed,
                requestsTotal: client.requests.total,
            });
        }

        this.log('Saved mirrors data');
    }

    public async fetchMirrorsData(): Promise<void> {
        const dbClients = await getMirrors();

        for (const client of this.clients) {
            let dbClient = dbClients.find(
                (c) => c.url === client.client.clientConfig.baseUrl,
            );

            if (!dbClient) {
                this.log(
                    `Mirror ${client.client.clientConfig.baseUrl} not found in database, creating new mirror`,
                    'warn',
                );

                dbClient = await createMirror({
                    url: client.client.clientConfig.baseUrl,
                    weight: client.weight,
                });
            }

            let benchmark = await getBenchmarkByMirrorId(dbClient.mirrorId);

            this.log(`Fetching data for ${dbClient.url}`);

            if (!benchmark) {
                this.log(
                    'Benchmark data not found or outdated, fetching new data',
                    'warn',
                );

                benchmark = await this._fetchMirrorData(client, dbClient);
            }

            client.requests.processed = dbClient.requestsProcessed;
            client.requests.failed = dbClient.requestsFailed;
            client.requests.total = dbClient.requestsTotal;
        }

        this.log('Fetched mirrors data');
    }

    private async _fetchMirrorData(
        client: MirrorClient,
        dbClient: Mirror,
    ): Promise<Benchmark | null> {
        const result = await this.compareService.benchmarkMirror(client);

        await createBenchmark({
            mirrorId: dbClient.mirrorId,
            downloadSpeed: result.downloadSpeed,
            APILatency: result.latency,
        });

        return getBenchmarkByMirrorId(dbClient.mirrorId);
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorManagerService: ${message}`);
    }
}
