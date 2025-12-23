import type { MiddlewareHandler } from 'hono'
import { FEATURES } from 'web-app/config'
import type { AuthEnv } from '../types'

/**
 * Feature flag middleware for AI chat
 * Simple check if AI chat features are enabled
 * Use for gradual rollout or emergency disable
 */
export const aiChatFeatureMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
	// Check feature flag
	if (!FEATURES.aiChat) {
		return c.json(
			{
				error: 'Feature not available',
				message: 'AI chat features are currently disabled. Please check back later.',
			},
			503,
		)
	}

	await next()
}
