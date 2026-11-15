import { beatmapsService } from "@observatory/beatmaps";

import { CalculatorService } from "./service/calculator.service";

export const calculatorService = new CalculatorService(beatmapsService);
