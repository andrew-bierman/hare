import { config } from '@hare/config'
import type { AuthEnv } from '@hare/types'
import type { MiddlewareHandler } from 'hono'

/**
 * Feature flag middleware for AI chat
 * Checks if AI chat features are enabled and if user has access (in beta mode)
 */
export const aiChatFeatureMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
	// Check global feature flag
	if (!config.features.aiChat) {
		return c.json(
			{
				error: 'Feature not available',
				message: 'AI chat features are currently disabled. Please check back later.',
			},
			503,
		)
	}

	// If beta mode is enabled, check user allowlist
	if (config.beta.enabled) {
		const user = c.get('user')
		if (!user) {
			return c.json({ error: 'Authentication required' }, 401)
		}

		const userEmail = user.email.toLowerCase()
		const isAllowed = config.beta.allowedEmails.includes(userEmail)

		if (!isAllowed) {
			return c.json(
				{
					error: 'Beta access required',
					message: 'This feature is currently in private beta. Please contact us for access.',
				},
				403,
			)
		}
	}

	await next()
}
