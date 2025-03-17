import path from 'path';
import { readdir, stat } from 'fs/promises';

export async function getDirectoryStats(directory: string) {
    const files = await readdir(directory);
    const stats = files.map((file) => stat(path.join(directory, file)));

    const fileStats = await Promise.all(stats);

    const result = fileStats.reduce(
        (accumulator, { size }) => {
            accumulator.totalSize += size;
            accumulator.fileCount += 1;
            return accumulator;
        },
        { totalSize: 0, fileCount: 0 },
    );

    return result;
}

export function bytesToHumanReadableMegabytes(bytes: number) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
