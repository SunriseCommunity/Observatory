import { BaseClient } from "../core/abstracts/domain/client.abstract";

export type MirrorClient<T extends BaseClient = BaseClient> = {
  client: T;
  weight: number;
  requests: {
    processed: number;
    failed: number;
    total: number;
  };
};
