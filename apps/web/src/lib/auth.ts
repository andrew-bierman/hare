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
			// Minimum password length enforced at schema level
			minPasswordLength: 8,
			maxPasswordLength: 128,
		},
		socialProviders: {
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
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
			cookieCache: {
				enabled: true,
				maxAge: 60 * 5, // 5 minutes
			},
		},
		// Enhanced cookie security
		advanced: {
			cookiePrefix: '__Host-', // More secure cookie prefix (requires HTTPS)
			crossSubDomainCookies: {
				enabled: false, // Disable for better security
			},
			useSecureCookies: serverEnv.NODE_ENV === 'production', // Force secure cookies in production
		},
		// Security settings
		trustedOrigins: [serverEnv.NEXT_PUBLIC_APP_URL],
		// Rate limiting for auth endpoints
		rateLimit: {
			enabled: true,
			window: 60, // 1 minute
			max: 10, // 10 requests per minute per IP
		},
	})
}

export type Auth = ReturnType<typeof createAuth>

// Export OAuth provider availability for client-side use
export const oauthProviders = {
	google: isGoogleConfigured,
	github: isGitHubConfigured,
}
