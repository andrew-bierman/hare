import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createDb } from 'web-app/db'
import * as schema from 'web-app/db/schema'

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
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
			cookieCache: {
				enabled: true,
				maxAge: 60 * 5, // 5 minutes
			},
		},
		trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
	})
}

export type Auth = ReturnType<typeof createAuth>
