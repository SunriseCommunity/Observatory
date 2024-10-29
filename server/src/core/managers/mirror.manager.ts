import {
  GetBeatmapOptions,
  GetBeatmapSetOptions,
} from "../abstracts/domain/client.types";
import { Beatmap, Beatmapset } from "../../types/beatmap";
import { DirectClient, BanchoClient } from "../domains/index";
import { MirrorClient } from "../../types/manager";

export class MirrorManager {
  private readonly directClient: DirectClient;
  private readonly banchoClient: BanchoClient;

  private readonly clients: MirrorClient[] = [];

  constructor() {
    this.directClient = new DirectClient();
    this.banchoClient = new BanchoClient();

    // TODO: Should parse old data from DB.
    // TODO: Update data in db every X time?

    this.clients = [
      {
        client: this.directClient,
        weight: 50,
        requests: {
          processed: 0,
          failed: 0,
          total: 0,
        },
      },
      {
        client: this.banchoClient,
        weight: 50,
        requests: {
          processed: 0,
          failed: 0,
          total: 0,
        },
      },
    ];
  }

  async getBeatmapSet(ctx: GetBeatmapSetOptions): Promise<Beatmapset | null> {
    const client = this._getClient();
    const result = await client.getBeatmapSet(ctx);

    return result.result;
  }

  async getBeatmap(ctx: GetBeatmapOptions): Promise<Beatmap | null> {
    const client = this._getClient();
    const result = await client.getBeatmap(ctx);

    return result.result;
  }

  private _getClient() {
    // TODO: Check if client has needed endpoints

    // TODO: Add logic to determine which client to use

    // TODO: Add rate limiting ? Maybe even just have rate limit logic in the client itself
    // Also add a way to check if the client is rate limited and ignore him for a while
    // Aaaand also go to the next client if the current one fails

    return Math.random() > 0.5 ? this.directClient : this.banchoClient;
  }
}
