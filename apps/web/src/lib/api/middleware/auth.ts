import type { Context, MiddlewareHandler } from 'hono'
import { createAuth } from 'web-app/lib/auth'
import { createDb } from 'web-app/db'

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
	const d1 = (c.env as { DB?: D1Database })?.DB

	if (!d1) {
		return c.json({ error: 'Service unavailable' }, 503)
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
	const d1 = (c.env as { DB?: D1Database })?.DB

	if (!d1) {
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
	} catch {
		// Ignore auth errors for optional auth
	}

	await next()
}
