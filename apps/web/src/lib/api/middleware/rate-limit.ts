import type { MiddlewareHandler } from 'hono'
import { and, eq, gte } from 'drizzle-orm'
import { rateLimits } from 'web-app/db/schema'
import { RATE_LIMITS } from 'web-app/config'
import { getDb } from '../db'
import type { AuthEnv } from '../types'

interface RateLimitOptions {
	endpoint: string
	maxRequests: number
	maxTokens?: number
	windowMs: number
}

/**
 * Create a rate limiting middleware
 * Tracks and enforces rate limits per user per endpoint
 */
export function createRateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler<AuthEnv> {
	return async (c, next) => {
		const user = c.get('user')
		if (!user) {
			// Skip rate limiting for unauthenticated requests
			// (they should be blocked by auth middleware anyway)
			await next()
			return
		}

		const db = await getDb(c)
		const now = new Date()
		const windowStart = new Date(now.getTime() - options.windowMs)

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
			.limit(1)

		// Get request metadata
		const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
		const userAgent = c.req.header('user-agent') || 'unknown'

		if (existing) {
			// Check if rate limit exceeded
			if (existing.requestCount >= options.maxRequests) {
				const resetAt = existing.windowEnd
				const resetIn = Math.ceil((resetAt.getTime() - now.getTime()) / 1000)

				return c.json(
					{
						error: 'Rate limit exceeded',
						message: `Too many requests. Please try again in ${resetIn} seconds.`,
						limit: options.maxRequests,
						remaining: 0,
						resetAt: resetAt.toISOString(),
						resetIn,
					},
					429,
				)
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
				.where(eq(rateLimits.id, existing.id))

			// Add rate limit info to response headers
			c.header('X-RateLimit-Limit', options.maxRequests.toString())
			c.header('X-RateLimit-Remaining', (options.maxRequests - existing.requestCount - 1).toString())
			c.header('X-RateLimit-Reset', existing.windowEnd.toISOString())
		} else {
			// Create new rate limit record
			const windowEnd = new Date(now.getTime() + options.windowMs)

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
			})

			// Add rate limit info to response headers
			c.header('X-RateLimit-Limit', options.maxRequests.toString())
			c.header('X-RateLimit-Remaining', (options.maxRequests - 1).toString())
			c.header('X-RateLimit-Reset', windowEnd.toISOString())
		}

		await next()
	}
}

/**
 * Rate limit middleware for chat endpoint
 */
export const chatRateLimitMiddleware = createRateLimitMiddleware({
	endpoint: '/agents/*/chat',
	maxRequests: RATE_LIMITS.chat.requestsPerHour,
	maxTokens: RATE_LIMITS.chat.tokensPerHour,
	windowMs: RATE_LIMITS.chat.windowMs,
})

/**
 * Update token count for rate limiting (call after processing)
 */
export async function updateTokenCount(
	db: any,
	userId: string,
	endpoint: string,
	tokenCount: number,
) {
	const now = new Date()

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
		.limit(1)

	if (existing) {
		await db
			.update(rateLimits)
			.set({
				tokenCount: existing.tokenCount + tokenCount,
				updatedAt: now,
			})
			.where(eq(rateLimits.id, existing.id))
	}
}
