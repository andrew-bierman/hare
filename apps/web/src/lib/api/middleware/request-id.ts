import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

/**
 * Request ID middleware for request tracing.
 * Generates or uses existing X-Request-ID header for tracing requests across services.
 */
export function requestId(): MiddlewareHandler<HonoEnv> {
	return async (c, next) => {
		// Check if request already has an ID from upstream
		let requestId = c.req.header('x-request-id')

		// Generate a new ID if none exists
		if (!requestId) {
			requestId = crypto.randomUUID()
		}

		// Set the request ID in response headers
		c.header('X-Request-ID', requestId)

		// Store in context for logging/debugging
		c.set('requestId', requestId)

		await next()
	}
}
