import { z } from 'zod'

/**
 * Server-side environment variables
 *
 * These are validated at import time. If validation fails,
 * the server will fail to start with a clear error message.
 *
 * DO NOT import this file in client-side code.
 */

const serverEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']),
	NEXT_PUBLIC_APP_URL: z.string().url(),
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
	// OAuth providers (optional)
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
})

function validateServerEnv() {
	const result = serverEnvSchema.safeParse({
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		ENABLE_AI_CHAT: process.env.ENABLE_AI_CHAT,
		AI_CHAT_BETA_MODE: process.env.AI_CHAT_BETA_MODE,
		AI_CHAT_ALLOWED_EMAILS: process.env.AI_CHAT_ALLOWED_EMAILS,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
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
