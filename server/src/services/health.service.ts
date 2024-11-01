import os from 'os';

export class HealthService {
    async get() {
        return {
            ...this.getSystemInfo(),
        };
    }

    private getSystemInfo() {
        const cpuUsage = process.cpuUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        return {
            cpuUsage,
            totalMemory,
            freeMemory,
        };
    }
}
