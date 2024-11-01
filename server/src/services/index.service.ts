export class IndexService {
    async get(ip: string) {
        return `Hello, ${ip}!`;
    }
}
