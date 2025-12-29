import { z } from 'zod'

/**
 * Tauri client environment variables
 *
 * Validated at import time using Zod.
 */

const envSchema = z.object({
	VITE_API_URL: z.string().url(),
})

function validateEnv() {
	const result = envSchema.safeParse({
		VITE_API_URL: import.meta.env.VITE_API_URL,
	})

	if (!result.success) {
		console.error('Invalid environment variables:')
		console.error(result.error.flatten().fieldErrors)
		throw new Error('Missing required environment variable: VITE_API_URL')
	}

	return result.data
}

export const env = validateEnv()

export type Env = z.infer<typeof envSchema>
