import { MirrorsHelper } from "../helper/mirrors.helper";

export abstract class MirrorsService {
  static async fetchMirrorsData() {
    await MirrorsHelper.updateMirrorWeights();
  }
}
