import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createDb } from '@hare/db'
import * as schema from '@hare/db/schema'

/**
 * Server environment configuration required for auth
 */
export interface AuthServerEnv {
	GOOGLE_CLIENT_ID?: string
	GOOGLE_CLIENT_SECRET?: string
	GITHUB_CLIENT_ID?: string
	GITHUB_CLIENT_SECRET?: string
	APP_URL: string
}

/**
 * Options for creating auth instance
 */
export interface CreateAuthOptions {
	d1: D1Database
	env: AuthServerEnv
}

/**
 * Create a Better Auth instance configured for Hare platform
 */
export function createAuth({ d1, env }: CreateAuthOptions) {
	const db = createDb(d1)

	// Check if OAuth providers are configured
	const isGoogleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
	const isGitHubConfigured = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: {
				user: schema.users,
				session: schema.sessions,
				account: schema.accounts,
				verification: schema.verifications,
			},
		}),
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
		},
		socialProviders: {
			...(isGoogleConfigured && {
				google: {
					clientId: env.GOOGLE_CLIENT_ID!,
					clientSecret: env.GOOGLE_CLIENT_SECRET!,
				},
			}),
			...(isGitHubConfigured && {
				github: {
					clientId: env.GITHUB_CLIENT_ID!,
					clientSecret: env.GITHUB_CLIENT_SECRET!,
				},
			}),
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
			cookieCache: {
				enabled: true,
				maxAge: 60 * 5, // 5 minutes
			},
		},
		trustedOrigins: [env.APP_URL],
	})
}

export type Auth = ReturnType<typeof createAuth>

/**
 * Get OAuth provider availability based on environment configuration
 */
export function getOAuthProviders(env: AuthServerEnv) {
	return {
		google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
		github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
	}
}
