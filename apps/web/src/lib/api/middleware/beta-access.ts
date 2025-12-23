import type { MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import { betaAccess } from 'web-app/db/schema'
import { BETA_CONFIG } from 'web-app/config'
import { getDb } from '../db'
import type { AuthEnv } from '../types'

/**
 * Beta access middleware
 * Checks if the authenticated user has beta access for AI features
 * Only applies when beta access control is enabled
 */
export const betaAccessMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
	// Skip check if beta access control is disabled
	if (!BETA_CONFIG.enabled) {
		await next()
		return
	}

	const user = c.get('user')
	if (!user) {
		return c.json({ error: 'Authentication required for beta features' }, 401)
	}

	const db = await getDb(c)

	// Check if user has beta access
	const [access] = await db
		.select()
		.from(betaAccess)
		.where(eq(betaAccess.userId, user.id))
		.limit(1)

	// Auto-grant access in development mode
	if (!access && BETA_CONFIG.autoGrantAccess) {
		await db.insert(betaAccess).values({
			userId: user.id,
			email: user.email,
			status: 'active',
			notes: 'Auto-granted in development mode',
		})

		// Update last access time
		await db
			.update(betaAccess)
			.set({ lastAccessAt: new Date() })
			.where(eq(betaAccess.userId, user.id))

		await next()
		return
	}

	if (!access || access.status !== 'active') {
		return c.json(
			{
				error: 'Beta access required',
				message: BETA_CONFIG.deniedMessage,
				status: access?.status || 'not_granted',
			},
			403,
		)
	}

	// Update last access time
	await db
		.update(betaAccess)
		.set({ lastAccessAt: new Date() })
		.where(eq(betaAccess.userId, user.id))

	await next()
}
