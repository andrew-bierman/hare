import { z } from 'zod'

/**
 * Server-side environment variables
 *
 * Validated at import time. Server will fail to start with clear error if invalid.
 * DO NOT import this file in client-side code.
 */

const serverEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
	const result = serverEnvSchema.safeParse({
		NODE_ENV: process.env.NODE_ENV,
		APP_URL: process.env.VITE_APP_URL,
		FEATURE_AI_CHAT: process.env.FEATURE_AI_CHAT,
		FEATURE_AI_CHAT_BETA_MODE: process.env.FEATURE_AI_CHAT_BETA_MODE,
		FEATURE_AI_CHAT_ALLOWED_EMAILS: process.env.FEATURE_AI_CHAT_ALLOWED_EMAILS,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
	})

	if (!result.success) {
		console.error('Invalid server environment variables:', result.error.flatten().fieldErrors)
		throw new Error('Invalid server environment variables')
	}

	return result.data
}

export const serverEnv = validateServerEnv()

export type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Client-side environment variables (VITE_*)
 *
 * Available in browser code via import.meta.env
 */

const clientEnvSchema = z.object({
	VITE_APP_URL: z.string().url().optional(),
})

function validateClientEnv() {
	const result = clientEnvSchema.safeParse({
		VITE_APP_URL: import.meta.env.VITE_APP_URL,
	})

	return {
		VITE_APP_URL: result.data?.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
	}
}

export const clientEnv = validateClientEnv()

export type ClientEnv = {
	VITE_APP_URL: string
}
