import Redis from 'ioredis';
import type { RateLimitConfig, RateLimitInfo } from '@saas/shared';

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;

export class RateLimiter {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  async isRateLimited(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<{ limited: boolean; info: RateLimitInfo }> {
    const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
    const maxRequests = config?.maxRequests ?? DEFAULT_MAX_REQUESTS;
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = this.getKey(identifier);

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.pexpire(key, windowMs);
    pipeline.zrange(key, 0, -1);

    const results = await pipeline.exec();

    const count = (results?.[1]?.[1] as number) ?? 0;
    const limited = count >= maxRequests;

    return {
      limited,
      info: {
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - count - (limited ? 1 : 0)),
        reset: now + windowMs,
      },
    };
  }

  async getRemaining(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitInfo> {
    const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
    const maxRequests = config?.maxRequests ?? DEFAULT_MAX_REQUESTS;
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = this.getKey(identifier);

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = (await this.redis.zcard(key)) ?? 0;

    return {
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - count),
      reset: now + windowMs,
    };
  }

  async reset(identifier: string): Promise<void> {
    await this.redis.del(this.getKey(identifier));
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export function createRateLimiterMiddleware(limiter: RateLimiter, config?: Partial<RateLimitConfig>) {
  return async (req: Request): Promise<Response | null> => {
    const identifier =
      req.headers.get('x-forwarded-for') ??
      req.headers.get('x-real-ip') ??
      'anonymous';

    const { limited, info } = await limiter.isRateLimited(identifier, config);

    if (limited) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many requests. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((info.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(info.limit),
            'X-RateLimit-Remaining': String(info.remaining),
            'X-RateLimit-Reset': String(info.reset),
          },
        }
      );
    }

    return null;
  };
}

export type { RateLimitConfig, RateLimitInfo };
