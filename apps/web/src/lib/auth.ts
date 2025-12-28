import {
	type Auth,
	type AuthServerEnv,
	type CreateAuthOptions,
	createAuth as createAuthBase,
	getOAuthProviders,
} from '@hare/auth/server'
import { serverEnv } from 'web-app/lib/env/server'

// Re-export types from @hare/auth
export type { Auth, AuthServerEnv, CreateAuthOptions }

/**
 * Create auth instance with D1 database.
 * Uses environment variables from serverEnv for OAuth configuration.
 */
export function createAuth(d1: D1Database): Auth {
	return createAuthBase({
		d1,
		env: {
			APP_URL: serverEnv.APP_URL,
			GOOGLE_CLIENT_ID: serverEnv.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: serverEnv.GOOGLE_CLIENT_SECRET,
			GITHUB_CLIENT_ID: serverEnv.GITHUB_CLIENT_ID,
			GITHUB_CLIENT_SECRET: serverEnv.GITHUB_CLIENT_SECRET,
		},
	})
}

// Export OAuth provider availability for client-side use
export const oauthProviders = getOAuthProviders({
	APP_URL: serverEnv.APP_URL,
	GOOGLE_CLIENT_ID: serverEnv.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: serverEnv.GOOGLE_CLIENT_SECRET,
	GITHUB_CLIENT_ID: serverEnv.GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET: serverEnv.GITHUB_CLIENT_SECRET,
})
