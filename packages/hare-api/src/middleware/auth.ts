import type { MiddlewareHandler } from 'hono'
import { createAuth, type AuthServerEnv } from '@hare/auth/server'
import { getD1 } from '../db'
import type { AuthEnv, OptionalAuthEnv } from '@hare/types'

/**
 * Helper to get auth server env from Hono context
 * OAuth credentials may be set in wrangler.toml [vars] or as secrets
 */
function getAuthEnv(c: { env: CloudflareEnv }): AuthServerEnv {
	// Cast to access optional OAuth env vars that may not be in the CloudflareEnv type
	const env = c.env as CloudflareEnv & {
		GOOGLE_CLIENT_ID?: string
		GOOGLE_CLIENT_SECRET?: string
		GITHUB_CLIENT_ID?: string
		GITHUB_CLIENT_SECRET?: string
	}
	return {
		APP_URL: env.APP_URL ?? 'http://localhost:3000',
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
	}
}

/**
 * Authentication middleware that validates the session and attaches user to context.
 * Use this for routes that require authentication.
 */
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
	const d1 = getD1(c)
	const authEnv = getAuthEnv(c)
	const auth = createAuth({ d1, env: authEnv })

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
	const d1 = getD1(c)
	const authEnv = getAuthEnv(c)
	const auth = createAuth({ d1, env: authEnv })

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
