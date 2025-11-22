import { HttpStatusCode } from 'axios';

export type ServerResponse<T> = {
    data: T | null;
    status: HttpStatusCode;
    message?: string;
    source: 'storage' | 'mirror' | null;
};
