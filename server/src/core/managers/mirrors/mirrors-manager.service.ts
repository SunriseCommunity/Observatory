import { getMirrors, createMirror } from '../../../database/models/mirrors';
import { getRequestsByBaseUrl } from '../../../database/models/requests';
import { Mirror } from '../../../database/schema';
import { BenchmarkResult } from '../../../types/benchmark';
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
            1000 * 60 * 10,
        ); // 10 minutes

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

            const benchmark = await this.getMirrorBenchmark(client, dbClient);

            client.weights = {
                API: this.exponentialDecrease(benchmark.latency || Infinity),
                download: this.exponentialIncrease(
                    benchmark.downloadSpeed || 0,
                ),
                failrate: benchmark.failrate,
            };
        }

        this.log('Finished updating mirrors data, current weights:');
        this.clients.forEach((client) => {
            this.log(
                `${client.client.clientConfig.baseUrl} - API: ${client.weights.API}, download: ${client.weights.download}, failrate: ${client.weights.failrate}`,
            );
        });
    }

    private async getMirrorBenchmark(
        client: MirrorClient,
        dbClient: Mirror,
    ): Promise<BenchmarkResult & { failrate: number }> {
        const requests = await getRequestsByBaseUrl(
            dbClient.url,
            getUTCDate().getTime() - 3 * 60 * 60 * 1000, // 3 hours
        );

        const [failedRequests, successfulRequests] = this.splitByCondition(
            requests,
            (r) => r.status >= 400 && r.status !== 404,
        );

        const [jsonRequests, downloadRequests] = this.splitByCondition(
            successfulRequests.filter((r) => r.status !== 404),
            (r) => r.contentType === 'application/json',
        );

        const failrate = failedRequests.length / requests.length || 0;

        const toBenchmark = this.compareService.abilitiesToBenchmark(client);

        if (
            (toBenchmark.api && jsonRequests.length === 0) ||
            (toBenchmark.download && downloadRequests.length === 0)
        ) {
            this.log(
                `Not enough data to calculate benchmark, fetching new data from "${dbClient.url}"`,
                'warn',
            );

            const benchmark = await this.fetchMirrorBenchmark(client);

            return {
                ...benchmark,
                failrate,
            };
        }

        const latency =
            jsonRequests.reduce((acc, r) => acc + (r.latency ?? 0), 0) /
            jsonRequests.length;

        const downloadSpeed =
            downloadRequests.reduce(
                (acc, r) => acc + (r.downloadSpeed ?? 0),
                0,
            ) / downloadRequests.length;

        return {
            latency,
            downloadSpeed,
            failrate,
        };
    }

    private exponentialDecrease(x: number): number {
        return 10000 * Math.exp((-1 / 10000) * x);
    }

    private exponentialIncrease(x: number): number {
        return 10000 * (1 - Math.exp((-1 / 10000) * x));
    }

    private async fetchMirrorBenchmark(
        client: MirrorClient,
    ): Promise<BenchmarkResult> {
        const result = await this.compareService.benchmarkMirror(client);

        return result;
    }

    private splitByCondition<T>(
        array: T[],
        condition: (item: T) => boolean,
    ): [T[], T[]] {
        return array.reduce(
            ([trueArr, falseArr], item) => {
                if (condition(item)) {
                    trueArr.push(item);
                } else {
                    falseArr.push(item);
                }
                return [trueArr, falseArr];
            },
            [[], []] as [T[], T[]],
        );
    }

    private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        logger[level](`MirrorsManagerService: ${message}`);
    }
}
