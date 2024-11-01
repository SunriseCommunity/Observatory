import Elysia from 'elysia';

import { AxiosInstance } from 'axios';

export class CoffeeService {
    private readonly _axiosInstance: AxiosInstance;

    constructor(axiosInstance: AxiosInstance) {
        this._axiosInstance = axiosInstance;
    }

    async get() {
        const response = await this._fetchCoffee();

        return response.data;
    }

    _fetchCoffee() {
        return this._axiosInstance.get(
            'https://coffee.alexflipnote.dev/random.json',
        );
    }
}
