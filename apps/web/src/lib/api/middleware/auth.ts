import type { MiddlewareHandler } from 'hono'
import { createAuth } from 'web-app/lib/auth'
import { getD1 } from '../db'
import type { AuthEnv, OptionalAuthEnv } from '../types'

/**
 * Authentication middleware that validates the session and attaches user to context.
 * Use this for routes that require authentication.
 */
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
	const d1 = await getD1(c)
	const auth = createAuth(d1)

	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (!session?.user) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

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
export const optionalAuthMiddleware: MiddlewareHandler<OptionalAuthEnv> = async (c, next) => {
	const d1 = await getD1(c)
	const auth = createAuth(d1)

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

	await next()
}
