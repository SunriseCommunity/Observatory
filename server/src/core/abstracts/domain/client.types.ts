export type ClientOptions = {
  baseUrl: string;
  rateLimit: {
    header: string | null;
    window: number;
    limit: number;
  };
};

export type GetBeatmapSetOptions = {
  beatmapSetId?: number;
  beatmapId?: number;
  beatmapHash?: string;
};

export type GetBeatmapOptions = {
  beatmapId?: number;
  beatmapHash?: string;
};

export type ResultWithPrice<T> = {
  result: T;
  price: number;
};
