/**
 * Auth Routes
 *
 * Better Auth handler mounted via Elysia's .mount() pattern.
 * Also provides OAuth provider discovery endpoint.
 */

import { type AuthServerEnv, createAuth, getOAuthProviders } from '@hare/auth/server'
import { isErrorType } from '@hare/checks'
import type { CloudflareEnv } from '@hare/types'
import { Elysia } from 'elysia'
import { CloudflareEnvError, cfContext, getD1 } from '../context'

function getAuthEnv(cfEnv: CloudflareEnv): AuthServerEnv {
	const env = cfEnv as CloudflareEnv & {
		BETTER_AUTH_SECRET?: string
		GOOGLE_CLIENT_ID?: string
		GOOGLE_CLIENT_SECRET?: string
		GITHUB_CLIENT_ID?: string
		GITHUB_CLIENT_SECRET?: string
	}

	if (!env.BETTER_AUTH_SECRET) {
		throw new Error('BETTER_AUTH_SECRET environment variable is required')
	}

	return {
		BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
		APP_URL: env.APP_URL ?? 'http://localhost:3000',
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
	}
}

export const authRoutes = new Elysia({ prefix: '/auth', name: 'auth-routes' })
	.use(cfContext)

	// OAuth providers endpoint
	.get('/providers', ({ cfEnv }) => {
		const authEnv = getAuthEnv(cfEnv)
		const providers = getOAuthProviders(authEnv)
		return {
			providers: {
				google: providers.google,
				github: providers.github,
			},
		}
	})

	// Mount Better Auth handler for all other auth routes
	// Use .mount() to bypass Elysia's body parsing - Better Auth needs the raw request body
	.mount(async (request) => {
		const cfModule = await import('cloudflare:workers')
		const cfEnv = (cfModule as unknown as { env: CloudflareEnv }).env
		let d1: D1Database
		try {
			d1 = getD1(cfEnv)
		} catch (e) {
			if (isErrorType(e, CloudflareEnvError)) {
				const path = new URL(request.url).pathname
				if (path.includes('/session') || path.includes('/get-session')) {
					return Response.json({ session: null, user: null })
				}
				return Response.json(
					{ error: 'Database not available', code: 'DB_UNAVAILABLE' },
					{ status: 503 },
				)
			}
			throw e
		}

		const authEnv = getAuthEnv(cfEnv)
		const auth = createAuth({ d1, env: authEnv })
		return auth.handler(request)
	})
