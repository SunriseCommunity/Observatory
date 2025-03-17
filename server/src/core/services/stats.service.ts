import { bytesToHumanReadableMegabytes } from '../../utils/stats';

export class StatsService {
    public getServerStatistics() {
        const uptimeNanoseconds = Bun.nanoseconds();
        const memory = process.memoryUsage();

        return {
            uptime: {
                nanoseconds: uptimeNanoseconds,
                pretty: this.formatNanoseconds(uptimeNanoseconds),
            },
            memory: this.humanReadableMemory(memory),
            pid: process.pid,
            version: Bun.version,
            revision: Bun.revision,
        };
    }

    private humanReadableMemory(memory: NodeJS.MemoryUsage) {
        return Object.fromEntries(
            Object.entries(memory).map(([key, value]) => [
                key,
                bytesToHumanReadableMegabytes(value),
            ]),
        );
    }

    private formatNanoseconds(nanoseconds: number) {
        let seconds = Math.floor(nanoseconds / 1e9);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);
        let days = Math.floor(hours / 24);

        seconds %= 60;
        minutes %= 60;
        hours %= 24;

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
}
