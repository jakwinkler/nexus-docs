import Redis from "ioredis";

let client: Redis | null = null;

function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", () => {
      /* swallow — rateLimit() fails open on errors */
    });
  }
  return client;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetSec: number;
}

/**
 * Fixed-window rate limiter.
 * Fails open if Redis is unreachable (better than 503-ing every request).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const bucket = `rl:${key}`;
  try {
    const redis = getRedis();
    const count = await redis.incr(bucket);
    if (count === 1) {
      await redis.expire(bucket, windowSec);
    }
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSec: windowSec,
    };
  } catch (err) {
    console.warn("[rate-limit] Redis error, failing open:", err);
    return { ok: true, remaining: limit, resetSec: windowSec };
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Helper: returns a 429 NextResponse if limited, else null.
 * Caller is responsible for early-return on non-null.
 */
export async function enforceRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<{ status: 429; body: { error: string; retryAfter: number } } | null> {
  const result = await rateLimit(`${scope}:${identifier}`, limit, windowSec);
  if (!result.ok) {
    return {
      status: 429,
      body: { error: "Too many requests. Please slow down.", retryAfter: result.resetSec },
    };
  }
  return null;
}
