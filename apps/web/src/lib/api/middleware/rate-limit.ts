import type { MiddlewareHandler } from "hono";
import { and, eq, gte } from "drizzle-orm";
import { rateLimits } from "web-app/db/schema";
import { RATE_LIMITS } from "web-app/config";
import type { Database } from "web-app/db/types";
import { getDb } from "../db";
import type { AuthEnv, HonoEnv } from "../types";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  endpoint: string;
  maxRequests: number;
  maxTokens?: number;
  windowMs: number;
}

interface SimpleRateLimitOptions {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Maximum requests per window (default: 100) */
  limit?: number;
  /** Key generator function - defaults to IP-based */
  keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string;
  /** Custom message for rate limit exceeded */
  message?: string;
}

// In-memory store for rate limiting (fallback for unauthenticated requests)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000; // 1 minute

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Create a rate limiting middleware with database-backed tracking
 * Tracks and enforces rate limits per user per endpoint
 */
export function createRateLimitMiddleware(
  options: RateLimitOptions,
): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      // Skip rate limiting for unauthenticated requests
      // (they should be blocked by auth middleware anyway)
      await next();
      return;
    }

    const db = await getDb(c);
    const now = new Date();

    // Get or create rate limit record for this user and endpoint
    const [existing] = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.userId, user.id),
          eq(rateLimits.endpoint, options.endpoint),
          gte(rateLimits.windowEnd, now),
        ),
      )
      .limit(1);

    // Get request metadata
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for") ||
      "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    if (existing) {
      // Check if rate limit exceeded
      if (existing.requestCount >= options.maxRequests) {
        const resetAt = existing.windowEnd;
        const resetIn = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

        return c.json(
          {
            error: "Rate limit exceeded",
            message: `Too many requests. Please try again in ${resetIn} seconds.`,
            limit: options.maxRequests,
            remaining: 0,
            resetAt: resetAt.toISOString(),
            resetIn,
          },
          429,
        );
      }

      // Update the count
      await db
        .update(rateLimits)
        .set({
          requestCount: existing.requestCount + 1,
          metadata: {
            lastIp: ip,
            lastUserAgent: userAgent,
          },
          updatedAt: now,
        })
        .where(eq(rateLimits.id, existing.id));

      // Add rate limit info to response headers
      c.header("X-RateLimit-Limit", options.maxRequests.toString());
      c.header(
        "X-RateLimit-Remaining",
        (options.maxRequests - existing.requestCount - 1).toString(),
      );
      c.header("X-RateLimit-Reset", existing.windowEnd.toISOString());
    } else {
      // Create new rate limit record
      const windowEnd = new Date(now.getTime() + options.windowMs);

      await db.insert(rateLimits).values({
        userId: user.id,
        endpoint: options.endpoint,
        requestCount: 1,
        tokenCount: 0,
        windowStart: now,
        windowEnd,
        metadata: {
          lastIp: ip,
          lastUserAgent: userAgent,
        },
      });

      // Add rate limit info to response headers
      c.header("X-RateLimit-Limit", options.maxRequests.toString());
      c.header("X-RateLimit-Remaining", (options.maxRequests - 1).toString());
      c.header("X-RateLimit-Reset", windowEnd.toISOString());
    }

    await next();
  };
}

/**
 * Simple in-memory rate limiting middleware.
 * Uses in-memory store - suitable for single-instance deployments or unauthenticated endpoints.
 * For distributed rate limiting, use createRateLimitMiddleware with database backing.
 */
export function rateLimiter(
  options: SimpleRateLimitOptions = {},
): MiddlewareHandler<HonoEnv> {
  const {
    windowMs = 60000,
    limit = 100,
    keyGenerator = (c) => {
      // Try to get real IP from Cloudflare headers
      const cfConnectingIp = c.req.header("cf-connecting-ip");
      const xForwardedFor = c.req.header("x-forwarded-for");
      const xRealIp = c.req.header("x-real-ip");
      return (
        cfConnectingIp ||
        xForwardedFor?.split(",")[0]?.trim() ||
        xRealIp ||
        "unknown"
      );
    },
    message = "Too many requests, please try again later",
  } = options;

  return async (c, next) => {
    cleanup();

    const key = keyGenerator(c);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, limit - entry.count);
    const reset = Math.ceil(entry.resetAt / 1000);

    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", reset.toString());

    if (entry.count > limit) {
      c.header(
        "Retry-After",
        Math.ceil((entry.resetAt - now) / 1000).toString(),
      );
      return c.json({ error: message }, 429);
    }

    await next();
  };
}

/**
 * Rate limit middleware for chat endpoint (database-backed)
 */
export const chatRateLimitMiddleware = createRateLimitMiddleware({
  endpoint: "/agents/*/chat",
  maxRequests: RATE_LIMITS.chat.requestsPerHour,
  maxTokens: RATE_LIMITS.chat.tokensPerHour,
  windowMs: RATE_LIMITS.chat.windowMs,
});

/**
 * Stricter rate limiter for sensitive operations (deploy, auth, etc.)
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minute
  limit: 10, // 10 requests per minute
  message: "Rate limit exceeded for sensitive operation",
});

/**
 * Rate limiter for chat/AI endpoints (more generous but still limited)
 */
export const chatRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minute
  limit: 30, // 30 requests per minute
  message: "Chat rate limit exceeded, please slow down",
});

/**
 * Rate limiter for general API endpoints
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 60000, // 1 minute
  limit: 100, // 100 requests per minute
  message: "API rate limit exceeded",
});

/**
 * Update token count for rate limiting (call after processing)
 */
export async function updateTokenCount(
  db: Database,
  userId: string,
  endpoint: string,
  tokenCount: number,
) {
  const now = new Date();

  const [existing] = await db
    .select()
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.endpoint, endpoint),
        gte(rateLimits.windowEnd, now),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(rateLimits)
      .set({
        tokenCount: existing.tokenCount + tokenCount,
        updatedAt: now,
      })
      .where(eq(rateLimits.id, existing.id));
  }
}
