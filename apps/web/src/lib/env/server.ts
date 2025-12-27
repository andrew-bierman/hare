import { z } from 'zod'

/**
 * Server-side environment variables
 *
 * These are validated at import time. If validation fails,
 * the server will fail to start with a clear error message.
 *
 * DO NOT import this file in client-side code.
 */

// Check if we're running in a test environment (vitest/workers pool)
const isTestEnv =
	typeof process !== 'undefined' &&
	(process.env?.VITEST === 'true' ||
		process.env?.NODE_ENV === 'test' ||
		(typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__vitest_worker__))

const serverEnvSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default(isTestEnv ? 'test' : 'development'),
	APP_URL: z.string().url().default('http://localhost:3000'),
	// Feature flags
	FEATURE_AI_CHAT: z
		.enum(['true', 'false'])
		.default('true')
		.transform((val) => val === 'true'),
	FEATURE_AI_CHAT_BETA_MODE: z
		.enum(['true', 'false'])
		.default('false')
		.transform((val) => val === 'true'),
	FEATURE_AI_CHAT_ALLOWED_EMAILS: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',').map((e) => e.trim().toLowerCase()) : [])),
	// OAuth providers (optional)
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
})

function validateServerEnv() {
	// Get environment value with support for Cloudflare Workers/Miniflare
	const getEnv = (key: string): string | undefined => {
		try {
			if (typeof process !== 'undefined' && process.env) {
				const value = process.env[key]
				// Return only valid string values
				if (typeof value === 'string' && value.length > 0) {
					return value
				}
			}
		} catch {
			// process.env access may fail in some environments
		}
		// Try import.meta.env for Vite
		try {
			if (typeof import.meta !== 'undefined' && import.meta.env) {
				const value = (import.meta.env as Record<string, string>)[key]
				if (typeof value === 'string' && value.length > 0) {
					return value
				}
			}
		} catch {
			// import.meta.env access may fail
		}
		return undefined
	}

	// Determine NODE_ENV
	const nodeEnvRaw = getEnv('NODE_ENV')
	const validNodeEnvs = ['development', 'production', 'test']
	const nodeEnv = validNodeEnvs.includes(nodeEnvRaw || '')
		? nodeEnvRaw
		: isTestEnv
			? 'test'
			: 'development'

	// Get app URL from various sources
	const appUrl =
		getEnv('APP_URL') ||
		getEnv('VITE_APP_URL') ||
		getEnv('NEXT_PUBLIC_APP_URL') ||
		'http://localhost:3000'

	const result = serverEnvSchema.safeParse({
		NODE_ENV: nodeEnv,
		APP_URL: appUrl,
		FEATURE_AI_CHAT: getEnv('FEATURE_AI_CHAT'),
		FEATURE_AI_CHAT_BETA_MODE: getEnv('FEATURE_AI_CHAT_BETA_MODE'),
		FEATURE_AI_CHAT_ALLOWED_EMAILS: getEnv('FEATURE_AI_CHAT_ALLOWED_EMAILS'),
		GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID'),
		GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET'),
		GITHUB_CLIENT_ID: getEnv('GITHUB_CLIENT_ID'),
		GITHUB_CLIENT_SECRET: getEnv('GITHUB_CLIENT_SECRET'),
	})

	if (!result.success) {
		console.error('Invalid server environment variables:')
		console.error(result.error.flatten().fieldErrors)
		throw new Error('Invalid server environment variables')
	}

	return result.data
}

export const serverEnv = validateServerEnv()

export type ServerEnv = z.infer<typeof serverEnvSchema>
