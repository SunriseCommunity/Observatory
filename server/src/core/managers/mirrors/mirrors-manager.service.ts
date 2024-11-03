import {
    getBenchmarkByMirrorId,
    createBenchmark,
} from '../../../database/models/benchmarks';
import { getMirrors, createMirror } from '../../../database/models/mirrors';
import { getRequestsByBaseUrl } from '../../../database/models/requests';
import { Mirror, Benchmark } from '../../../database/schema';
import { getUTCDate } from '../../../utils/date';
import logger from '../../../utils/logger';
import { MirrorClient } from '../../abstracts/client/base-client.types';
import { CompareService } from '../../services/compare.service';

export class MirrorsManagerService {
    private readonly clients: MirrorClient[];
    private readonly compareService: CompareService;

    constructor(clients: MirrorClient[]) {
        this.compareService = new CompareService();
        this.clients = clients;

        setInterval(
            () => {
                this.fetchMirrorsData();
            },
            1000 * 60 * 15,
        ); // 15 minutes

        this.log('Initialized');
    }

    public async fetchMirrorsData(): Promise<void> {
        const dbClients = await getMirrors();

        this.log(
            'Started updating mirrors data. Perfomance may be affected',
            'warn',
        );

        for (const client of this.clients) {
            let dbClient = dbClients.find(
                (c) => c.url === client.client.clientConfig.baseUrl,
            );

            if (!dbClient) {
                this.log(
                    `Mirror ${client.client.clientConfig.baseUrl} not found in database, creating new entry`,
                    'warn',
                );

                dbClient = await createMirror({
                    url: client.client.clientConfig.baseUrl,
                });
            }

            let benchmark = await getBenchmarkByMirrorId(dbClient.mirrorId);

            if (!benchmark) {
                this.log(
                    'Benchmark data not found or outdated, fetching new data',
                    'warn',
                );

                benchmark = await this.fetchMirrorBenchmark(client, dbClient);
            }

            const requests = await getRequestsByBaseUrl(
                dbClient.url,
                getUTCDate().getTime() - 6 * 60 * 60 * 1000, // 6 hours
            );

            const failedRequests = requests.filter(
                (r) => r.status >= 400 && r.status !== 404,
            );

            const failrate = failedRequests.length / requests.length || 0;

            client.weights = {
                API: this.exponentialDecrease(benchmark.APILatency),
                download: this.exponentialDecrease(
                    benchmark.downloadSpeed || 0,
                    false,
                ),
                failrate,
            };
        }

        this.log('Finished updating mirrors data, current weights:');
        this.clients.forEach((client) => {
            this.log(
                `${client.client.clientConfig.baseUrl} - API: ${client.weights.API}, download: ${client.weights.download}, failrate: ${client.weights.failrate}`,
            );
        });
    }

    private exponentialDecrease(x: number, lower = true): number {
        return 1000 * Math.exp(((lower ? -1 : 1) / 1000) * x);
    }

    private async fetchMirrorBenchmark(
        client: MirrorClient,
        dbClient: Mirror,
    ): Promise<Benchmark> {
        const result = await this.compareService.benchmarkMirror(client);

        await createBenchmark({
            mirrorId: dbClient.mirrorId,
            downloadSpeed: result.downloadSpeed,
            APILatency: result.latency,
        });

        return getBenchmarkByMirrorId(dbClient.mirrorId) as Promise<Benchmark>;
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorsManagerService: ${message}`);
    }
}
