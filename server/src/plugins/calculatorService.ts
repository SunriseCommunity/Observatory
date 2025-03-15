import Elysia from 'elysia';
import { CalculatorService } from '../core/services/calculator.service';

export const CalculatorServiceInstance = new CalculatorService();

export const CalculatorServicePlugin = new Elysia({
    name: 'CalculatorService',
}).decorate(() => ({
    CalculatorServiceInstance,
}));
