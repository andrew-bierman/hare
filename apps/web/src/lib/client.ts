import { hc } from 'hono/client'
import type { AppType } from './api/index'

/**
 * Type-safe Hono RPC client for making API calls
 *
 * Usage in client components:
 * ```tsx
 * import { client } from '@/lib/client'
 *
 * const response = await client.api.agents.$get()
 * const data = await response.json()
 * ```
 */
export const client = hc<AppType>(
	typeof window !== 'undefined'
		? '' // Relative URL in browser
		: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
)

/**
 * Helper function to get the API client instance
 * Useful for dependency injection or testing
 */
export function getClient() {
	return client
}

/**
 * Export type for use in components and hooks
 */
export type Client = typeof client
