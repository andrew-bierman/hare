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
	process.env.VITEST === 'true' ||
	process.env.NODE_ENV === 'test' ||
	(typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__vitest_worker__)

const serverEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default(isTestEnv ? 'test' : 'development'),
	NEXT_PUBLIC_APP_URL: z.string().url().default(isTestEnv ? 'http://localhost:3000' : ''),
	ENABLE_AI_CHAT: z
		.enum(['true', 'false'])
		.default('true')
		.transform((val) => val === 'true'),
	AI_CHAT_BETA_MODE: z
		.enum(['true', 'false'])
		.default('false')
		.transform((val) => val === 'true'),
	AI_CHAT_ALLOWED_EMAILS: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',').map((e) => e.trim().toLowerCase()) : [])),
})

function validateServerEnv() {
	const result = serverEnvSchema.safeParse({
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		ENABLE_AI_CHAT: process.env.ENABLE_AI_CHAT,
		AI_CHAT_BETA_MODE: process.env.AI_CHAT_BETA_MODE,
		AI_CHAT_ALLOWED_EMAILS: process.env.AI_CHAT_ALLOWED_EMAILS,
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
