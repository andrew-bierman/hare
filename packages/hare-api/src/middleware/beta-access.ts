import type { MiddlewareHandler } from 'hono'
import { BETA_ACCESS, FEATURES } from '@hare/config'
import type { AuthEnv } from '../types'

/**
 * Feature flag middleware for AI chat
 * Checks if AI chat features are enabled and if user has access (in beta mode)
 */
export const aiChatFeatureMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
	// Check global feature flag
	if (!FEATURES.aiChat) {
		return c.json(
			{
				error: 'Feature not available',
				message: 'AI chat features are currently disabled. Please check back later.',
			},
			503,
		)
	}

	// If beta mode is enabled, check user allowlist
	if (BETA_ACCESS.enabled) {
		const user = c.get('user')
		if (!user) {
			return c.json({ error: 'Authentication required' }, 401)
		}

		const userEmail = user.email.toLowerCase()
		const isAllowed = BETA_ACCESS.allowedEmails.includes(userEmail)

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
