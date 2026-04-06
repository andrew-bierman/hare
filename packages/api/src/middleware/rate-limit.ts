import {
	type RateLimitBinding,
	type RateLimitKeyFunc,
	rateLimit,
} from '@elithrar/workers-hono-rate-limit'
import type { HonoEnv } from '@hare/types'
import type { Context, MiddlewareHandler, Next } from 'hono'

/**
 * Get a rate limit key based on user ID (preferred) or IP address (fallback).
 * Using user ID is more reliable than IP for authenticated routes.
 */
const getUserOrIpKey: RateLimitKeyFunc = (c: Context): string => {
	// Try to get user ID from context (set by auth middleware)
	const user = c.get('user')
	if (user?.id) {
		return `user:${user.id}`
	}

	// Fallback to IP-based limiting for unauthenticated requests
	const cfConnectingIp = c.req.header('cf-connecting-ip')
	const xForwardedFor = c.req.header('x-forwarded-for')
	const xRealIp = c.req.header('x-real-ip')
	const ip = cfConnectingIp || xForwardedFor?.split(',')[0]?.trim() || xRealIp || 'unknown'

	return `ip:${ip}`
}

/**
 * Get a rate limit key based on API key (for external API access).
 */
const getApiKeyOrIpKey: RateLimitKeyFunc = (c: Context): string => {
	// Try to get API key from context (set by apiKey middleware)
	const apiKey = c.get('apiKey')
	if (apiKey?.id) {
		return `apikey:${apiKey.id}`
	}

	// Fallback to IP
	const cfConnectingIp = c.req.header('cf-connecting-ip')
	const xForwardedFor = c.req.header('x-forwarded-for')
	const ip = cfConnectingIp || xForwardedFor?.split(',')[0]?.trim() || 'unknown'

	return `ip:${ip}`
}

/**
 * Create a rate limiting middleware using Cloudflare's native rate limiting.
 * Uses the specified binding and key generator function.
 */
function createRateLimiter(
	getBinding: (c: Context<HonoEnv>) => RateLimitBinding,
	keyFunc: RateLimitKeyFunc = getUserOrIpKey,
): MiddlewareHandler<HonoEnv> {
	return async (c: Context<HonoEnv>, next: Next) => {
		const binding = getBinding(c)
		return rateLimit(binding, keyFunc)(c, next)
	}
}

/**
 * General API rate limiter (100 requests per minute).
 * Use for standard API endpoints.
 */
export const apiRateLimiter: MiddlewareHandler<HonoEnv> = createRateLimiter(
	(c) => c.env.RATE_LIMITER,
	getUserOrIpKey,
)

/**
 * Strict rate limiter for sensitive operations (10 requests per minute).
 * Use for auth, deploy, and other sensitive endpoints.
 */
export const strictRateLimiter: MiddlewareHandler<HonoEnv> = createRateLimiter(
	(c) => c.env.RATE_LIMITER_STRICT,
	getUserOrIpKey,
)

/**
 * Chat rate limiter (30 requests per minute).
 * Use for AI chat endpoints.
 */
export const chatRateLimiter: MiddlewareHandler<HonoEnv> = createRateLimiter(
	(c) => c.env.RATE_LIMITER_CHAT,
	getUserOrIpKey,
)

/**
 * Rate limiter for external API access via API keys.
 * Uses API key as the limiting key.
 */
export const externalApiRateLimiter: MiddlewareHandler<HonoEnv> = createRateLimiter(
	(c) => c.env.RATE_LIMITER,
	getApiKeyOrIpKey,
)
