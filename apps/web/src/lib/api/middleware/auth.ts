import type { MiddlewareHandler } from 'hono'
import { createAuth } from 'web-app/lib/auth'
import { getD1 } from '../db'
import { logger } from 'web-app/lib/logger'

export interface AuthUser {
	id: string
	email: string
	name: string | null
	image: string | null
}

export interface AuthVariables {
	user: AuthUser
	session: {
		id: string
		expiresAt: Date
	}
}

/**
 * Authentication middleware that validates the session and attaches user to context.
 * Use this for routes that require authentication.
 */
export const authMiddleware: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
	const d1 = await getD1(c)

	if (!d1) {
		// If database isn't available, we can't verify auth, so treat as unauthorized
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const auth = createAuth(d1)

	// Get session from cookie
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (!session || !session.user) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	// Attach user and session to context
	c.set('user', {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name ?? null,
		image: session.user.image ?? null,
	})

	c.set('session', {
		id: session.session.id,
		expiresAt: session.session.expiresAt,
	})

	await next()
}

/**
 * Optional auth middleware - doesn't reject if no session, just doesn't set user.
 * Use for routes that work with or without authentication.
 */
export const optionalAuthMiddleware: MiddlewareHandler<{ Variables: Partial<AuthVariables> }> = async (c, next) => {
	const d1 = await getD1(c)

	if (!d1) {
		logger.debug('Database not available for optional auth', { path: c.req.path })
		await next()
		return
	}

	const auth = createAuth(d1)

	try {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		})

		if (session?.user) {
			c.set('user', {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name ?? null,
				image: session.user.image ?? null,
			})

			c.set('session', {
				id: session.session.id,
				expiresAt: session.session.expiresAt,
			})
		}
	} catch (error) {
		// Log but continue - optional auth should not block requests
		logger.debug('Optional auth session check failed', { path: c.req.path }, error)
	}

	await next()
}
