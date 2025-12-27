import { z } from 'zod'

/**
 * Client-side environment variables (VITE_*)
 *
 * These are available in browser code and validated at import time.
 * Only VITE_* variables are accessible in the browser via import.meta.env
 */

const clientEnvSchema = z.object({
	VITE_APP_URL: z.string().url().optional(),
})

function validateClientEnv() {
	// In Vite, use import.meta.env for client env vars
	const envVars =
		typeof import.meta !== 'undefined' && import.meta.env
			? {
					VITE_APP_URL: import.meta.env.VITE_APP_URL,
				}
			: {
					VITE_APP_URL: undefined,
				}

	const result = clientEnvSchema.safeParse(envVars)

	if (!result.success) {
		console.error('Invalid client environment variables:')
		console.error(result.error.flatten().fieldErrors)
		// Don't throw in development/build - just use defaults
	}

	return {
		VITE_APP_URL: result.data?.VITE_APP_URL || getDefaultAppUrl(),
	}
}

function getDefaultAppUrl(): string {
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return 'http://localhost:3000'
}

export const clientEnv = validateClientEnv()

export type ClientEnv = {
	VITE_APP_URL: string
}
