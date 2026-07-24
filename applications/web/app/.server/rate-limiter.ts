const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_TRACKED_CLIENTS = 10_000;

type Bucket = {
  count: number;
  windowStartedAt: number;
};

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Fixed-window, per-client, in-memory rate limiter for the shorten action.
 *
 * Right-sized for a single instance (which is how this service deploys).
 * Running multiple replicas would need a shared store (Redis) behind the
 * same `check` signature — the callers wouldn't change.
 */
export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly windowMs = WINDOW_MS,
    private readonly maxRequests = MAX_REQUESTS_PER_WINDOW,
  ) {}

  check(clientKey: string, now = Date.now()): RateLimitDecision {
    this.evictStaleEntries(now);

    const bucket = this.buckets.get(clientKey);
    if (!bucket || now - bucket.windowStartedAt >= this.windowMs) {
      this.buckets.set(clientKey, { count: 1, windowStartedAt: now });
      return { allowed: true };
    }

    bucket.count += 1;
    if (bucket.count <= this.maxRequests) {
      return { allowed: true };
    }

    const retryAfterSeconds = Math.ceil(
      (bucket.windowStartedAt + this.windowMs - now) / 1000,
    );
    return { allowed: false, retryAfterSeconds };
  }

  /** Caps memory: stale windows are dropped once the map grows large. */
  private evictStaleEntries(now: number): void {
    if (this.buckets.size < MAX_TRACKED_CLIENTS) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStartedAt >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}

const globalCache = globalThis as { __rateLimiter?: FixedWindowRateLimiter };

export function getRateLimiter(): FixedWindowRateLimiter {
  globalCache.__rateLimiter ??= new FixedWindowRateLimiter();
  return globalCache.__rateLimiter;
}

/**
 * Client identity for rate limiting. X-Forwarded-For is only honored when
 * TRUST_PROXY=true — trusting it blindly would let an attacker rotate fake
 * IPs through the header and bypass the limiter entirely.
 */
export function getClientKey(request: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    const [clientIp] = forwarded?.split(",") ?? [];
    if (clientIp?.trim()) {
      return clientIp.trim();
    }
  }
  return "direct";
}
