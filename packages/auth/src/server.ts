import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createDb } from '@hare/db'
import * as schema from '@hare/db/schema'
import { createEmailService, type EmailEnv } from '@hare/email'

/**
 * Server environment configuration required for auth
 */
export interface AuthServerEnv {
	BETTER_AUTH_SECRET: string
	GOOGLE_CLIENT_ID?: string
	GOOGLE_CLIENT_SECRET?: string
	GITHUB_CLIENT_ID?: string
	GITHUB_CLIENT_SECRET?: string
	APP_URL: string
	/** Resend API key for email sending */
	RESEND_API_KEY?: string
	/** Email from address */
	EMAIL_FROM?: string
	/** App name for emails */
	APP_NAME?: string
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
		secret: env.BETTER_AUTH_SECRET,
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
			// Password reset configuration
			sendResetPassword: async ({ user, url }) => {
				const emailService = createEmailService(env as EmailEnv)
				const result = await emailService.sendPasswordReset({
					to: user.email,
					resetUrl: url,
				})

				if (!result.success) {
					console.error(`[Auth] Failed to send password reset email to ${user.email}:`, result.error)
				} else {
					console.log(`[Auth] Password reset email sent to ${user.email} (${result.messageId})`)
				}
			},
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
		trustedOrigins: [
			env.APP_URL,
			// Only allow localhost origins in development (when APP_URL is localhost)
			// Support any localhost port for worktree development
			...(env.APP_URL.includes('localhost')
				? [
						'http://localhost:3000',
						'http://localhost:3001',
						'http://localhost:8787',
						// Support worktree ports (3001-3099)
						...Array.from({ length: 99 }, (_, i) => `http://localhost:${3001 + i}`),
					]
				: []),
		],
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
