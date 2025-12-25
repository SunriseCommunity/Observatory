import Elysia from "elysia";

import { CalculatorManager } from "../core/managers/calculator/calculator.manager";

export const CalculatorManagerInstance = new CalculatorManager();

export const CalculatorManagerPlugin = new Elysia({
  name: "CalculatorManager",
}).decorate(() => ({
  CalculatorManagerInstance,
}));
