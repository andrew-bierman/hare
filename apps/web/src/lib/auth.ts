import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createDb } from 'web-app/db'
import * as schema from 'web-app/db/schema'
import { serverEnv } from 'web-app/lib/env/server'

// Check if OAuth providers are configured
const isGoogleConfigured = Boolean(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET)
const isGitHubConfigured = Boolean(serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET)

// Auth instance - will be initialized with D1 binding at runtime
export function createAuth(d1: D1Database) {
	const db = createDb(d1)

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
<<<<<<< HEAD
			...(isGoogleConfigured && {
				google: {
					clientId: serverEnv.GOOGLE_CLIENT_ID!,
					clientSecret: serverEnv.GOOGLE_CLIENT_SECRET!,
				},
			}),
			...(isGitHubConfigured && {
				github: {
					clientId: serverEnv.GITHUB_CLIENT_ID!,
					clientSecret: serverEnv.GITHUB_CLIENT_SECRET!,
				},
			}),
=======
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID || '',
				clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
				enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
			},
			github: {
				clientId: process.env.GITHUB_CLIENT_ID || '',
				clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
				enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
			},
>>>>>>> origin/main
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
			cookieCache: {
				enabled: true,
				maxAge: 60 * 5, // 5 minutes
			},
		},
		trustedOrigins: [serverEnv.NEXT_PUBLIC_APP_URL],
	})
}

export type Auth = ReturnType<typeof createAuth>

// Export OAuth provider availability for client-side use
export const oauthProviders = {
	google: isGoogleConfigured,
	github: isGitHubConfigured,
}
