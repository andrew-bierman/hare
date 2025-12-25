import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

interface RateLimitEntry {
	count: number
	resetAt: number
}

interface RateLimitOptions {
	/** Time window in milliseconds (default: 60000 = 1 minute) */
	windowMs?: number
	/** Maximum requests per window (default: 100) */
	limit?: number
	/** Key generator function - defaults to IP-based */
	keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string
	/** Custom message for rate limit exceeded */
	message?: string
}

// In-memory store for rate limiting
// Note: For distributed deployments, consider using Cloudflare KV or Durable Objects
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60000 // 1 minute

function cleanup() {
	const now = Date.now()
	if (now - lastCleanup < CLEANUP_INTERVAL) return

	lastCleanup = now
	for (const [key, entry] of rateLimitStore) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key)
		}
	}
}

/**
 * Rate limiting middleware.
 * Uses in-memory store by default - suitable for single-instance deployments.
 * For distributed rate limiting, integrate with Cloudflare KV or Durable Objects.
 */
export function rateLimiter(options: RateLimitOptions = {}): MiddlewareHandler<HonoEnv> {
	const {
		windowMs = 60000,
		limit = 100,
		keyGenerator = (c) => {
			// Try to get real IP from Cloudflare headers
			const cfConnectingIp = c.req.header('cf-connecting-ip')
			const xForwardedFor = c.req.header('x-forwarded-for')
			const xRealIp = c.req.header('x-real-ip')
			return cfConnectingIp || xForwardedFor?.split(',')[0]?.trim() || xRealIp || 'unknown'
		},
		message = 'Too many requests, please try again later',
	} = options

	return async (c, next) => {
		cleanup()

		const key = keyGenerator(c)
		const now = Date.now()

		let entry = rateLimitStore.get(key)

		if (!entry || entry.resetAt < now) {
			entry = { count: 0, resetAt: now + windowMs }
			rateLimitStore.set(key, entry)
		}

		entry.count++

		// Set rate limit headers
		const remaining = Math.max(0, limit - entry.count)
		const reset = Math.ceil(entry.resetAt / 1000)

		c.header('X-RateLimit-Limit', limit.toString())
		c.header('X-RateLimit-Remaining', remaining.toString())
		c.header('X-RateLimit-Reset', reset.toString())

		if (entry.count > limit) {
			c.header('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString())
			return c.json({ error: message }, 429)
		}

		await next()
	}
}

/**
 * Stricter rate limiter for sensitive operations (deploy, auth, etc.)
 */
export const strictRateLimiter = rateLimiter({
	windowMs: 60000, // 1 minute
	limit: 10, // 10 requests per minute
	message: 'Rate limit exceeded for sensitive operation',
})

/**
 * Rate limiter for chat/AI endpoints (more generous but still limited)
 */
export const chatRateLimiter = rateLimiter({
	windowMs: 60000, // 1 minute
	limit: 30, // 30 requests per minute
	message: 'Chat rate limit exceeded, please slow down',
})

/**
 * Rate limiter for general API endpoints
 */
export const apiRateLimiter = rateLimiter({
	windowMs: 60000, // 1 minute
	limit: 100, // 100 requests per minute
	message: 'API rate limit exceeded',
})
