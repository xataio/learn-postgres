import "server-only";

/**
 * Sliding-window in-memory rate limiter. Per-process (i.e. per warm Vercel
 * function instance) — fine for a learning sandbox where the goal is to stop
 * runaway loops, not to enforce global fairness. If you ever need cross-instance
 * accuracy, swap the timestamps map for Redis/Upstash and keep the interface.
 */

type Entry = { timestamps: number[] };

const globalForRate = globalThis as unknown as {
  __learnRateBuckets?: Map<string, Entry>;
};

const buckets: Map<string, Entry> =
  globalForRate.__learnRateBuckets ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRate.__learnRateBuckets = buckets;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message?: string) {
    super(
      message ?? `Rate limited — retry in ${retryAfterSeconds}s.`,
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Convenience wrapper around checkRate that throws RateLimitError instead of
 * returning a result — useful when the call site doesn't want to inline the
 * allow/deny branching.
 */
export function enforceRate(
  key: string,
  limit: number,
  windowMs: number,
  message?: string,
): void {
  const result = checkRate(key, limit, windowMs);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds, message);
  }
}

export function checkRate(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = buckets.get(key) ?? { timestamps: [] };

  // Drop expired timestamps from the front.
  let i = 0;
  while (i < entry.timestamps.length && entry.timestamps[i] < cutoff) i++;
  if (i > 0) entry.timestamps = entry.timestamps.slice(i);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    buckets.set(key, entry);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);
  return {
    allowed: true,
    limit,
    remaining: limit - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}
