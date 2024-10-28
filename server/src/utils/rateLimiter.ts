export class RateLimiter {
  private readonly timeWindowMs: number;
  private readonly callsPerWindow: number;
  private readonly requests: Date[] = [];

  constructor(timeWindow: number, limit: number) {
    this.timeWindowMs = timeWindow;
    this.callsPerWindow = limit;
  }

  public cleanUp() {
    const now = Date.now();

    this.requests.filter((request) => {
      return now - request.getTime() < this.timeWindowMs;
    });
  }

  public isAllowed() {
    this.cleanUp();

    if (this.requests.length < this.callsPerWindow) {
      this.requests.push(new Date());
      return true;
    }

    return false;
  }

  public getRateLimit() {
    return {
      window: this.timeWindowMs,
      limit: this.callsPerWindow,
    };
  }
}         
