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
})

function validateServerEnv() {
	// Get environment value with support for Cloudflare Workers/Miniflare
	const getEnv = (key: string): string | undefined => {
		try {
			const value = process?.env?.[key]
			// Return only valid string values
			if (typeof value === 'string' && value.length > 0) {
				return value
			}
		} catch {
			// process.env access may fail in some environments
		}
		return undefined
	}

	// Determine NODE_ENV - in Cloudflare Workers test environment, default to 'test'
	const nodeEnvRaw = getEnv('NODE_ENV')
	const validNodeEnvs = ['development', 'production', 'test']
	const nodeEnv = validNodeEnvs.includes(nodeEnvRaw || '') ? nodeEnvRaw : 'test'

	// Get app URL - use test default if NODE_ENV is test and URL is not set
	const appUrl =
		getEnv('NEXT_PUBLIC_APP_URL') || (nodeEnv === 'test' ? 'http://localhost:3000' : undefined)

	const result = serverEnvSchema.safeParse({
		NODE_ENV: nodeEnv,
		NEXT_PUBLIC_APP_URL: appUrl,
		ENABLE_AI_CHAT: getEnv('ENABLE_AI_CHAT'),
		AI_CHAT_BETA_MODE: getEnv('AI_CHAT_BETA_MODE'),
		AI_CHAT_ALLOWED_EMAILS: getEnv('AI_CHAT_ALLOWED_EMAILS'),
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
