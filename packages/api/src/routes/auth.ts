import { Hono } from 'hono'
import { createAuth, getOAuthProviders, type AuthServerEnv } from '@hare/auth/server'
import { CloudflareEnvError, getD1 } from '../db'
import type { HonoEnv } from '@hare/types'

/**
 * Helper to get auth server env from Hono context
 * OAuth credentials may be set in wrangler.toml [vars] or as secrets
 */
function getAuthEnv(c: { env: CloudflareEnv }): AuthServerEnv {
	// Cast to access optional OAuth env vars that may not be in the CloudflareEnv type
	const env = c.env as CloudflareEnv & {
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

const app = new Hono<HonoEnv>()
	// Endpoint to get available OAuth providers (no auth required)
	.get('/providers', (c) => {
		const authEnv = getAuthEnv(c)
		const providers = getOAuthProviders(authEnv)
		return c.json({
			providers: {
				google: providers.google,
				github: providers.github,
			},
		})
	})
	// Handle all other auth routes via Better Auth
	.all('/*', async (c) => {
		let d1: D1Database
		try {
			d1 = getD1(c)
		} catch (e) {
			if (e instanceof CloudflareEnvError) {
				// For session endpoints, return null session instead of error
				// This allows client to handle "not logged in" gracefully
				const path = c.req.path
				if (path.includes('/session') || path.includes('/get-session')) {
					return c.json({ session: null, user: null })
				}
				return c.json({ error: 'Database not available', code: 'DB_UNAVAILABLE' }, 503)
			}
			throw e
		}

		const authEnv = getAuthEnv(c)
		const auth = createAuth({ d1, env: authEnv })
		return auth.handler(c.req.raw)
	})

export default app
