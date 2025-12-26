import { z } from 'zod'

/**
 * Client-side environment variables (NEXT_PUBLIC_*)
 *
 * These are available in browser code and validated at import time.
 * Only NEXT_PUBLIC_* variables are accessible in the browser.
 */

const clientEnvSchema = z.object({
	NEXT_PUBLIC_APP_URL: z.string().url(),
})

function validateClientEnv() {
	const result = clientEnvSchema.safeParse({
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	})

	if (!result.success) {
		console.error('Invalid client environment variables:')
		console.error(result.error.flatten().fieldErrors)
		throw new Error('Invalid client environment variables')
	}

	return result.data
}

export const clientEnv = validateClientEnv()

export type ClientEnv = z.infer<typeof clientEnvSchema>
