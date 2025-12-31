/**
 * Type-safe Hono RPC Client
 *
 * Uses Hono's `hc` client for automatic type inference from routes.
 * Types are inferred from the route definitions - no manual type maintenance needed.
 */

import { hc } from 'hono/client'
import type { AppType } from './index'

// =============================================================================
// Client Creation
// =============================================================================

/**
 * Get base URL for API requests.
 * Supports Vite environment variable (for Tauri) or falls back to window.location.origin.
 */
function getBaseURL(): string {
	// Check for Vite environment variable (used by Tauri and other Vite apps)
	if (
		typeof import.meta !== 'undefined' &&
		(import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
	) {
		return (import.meta as unknown as { env: { VITE_API_URL: string } }).env.VITE_API_URL
	}
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return ''
}

/**
 * Create the type-safe Hono RPC client.
 * All types are automatically inferred from route definitions.
 */
export function createApiClient(baseUrl?: string) {
	return hc<AppType>(baseUrl ?? getBaseURL(), {
		fetch: (input: RequestInfo | URL, init?: RequestInit) =>
			fetch(input, {
				...init,
				credentials: 'include',
			}),
	})
}

/**
 * Default API client instance.
 * Uses the auto-detected base URL.
 */
export const api = createApiClient()

// =============================================================================
// Error Handling
// =============================================================================

export class ApiClientError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string,
	) {
		super(message)
		this.name = 'ApiClientError'
	}
}

/**
 * Helper to handle response and extract JSON with proper error handling.
 */
export async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		let errorMessage = `Request failed with status ${response.status}`
		let errorCode: string | undefined

		try {
			const error = (await response.json()) as { error: string; code?: string }
			errorMessage = error.error
			errorCode = error.code
		} catch {
			// Response wasn't JSON, use default message
		}

		throw new ApiClientError(errorMessage, response.status, errorCode)
	}

	return response.json() as Promise<T>
}

// Re-export the client type for convenience
export type ApiClient = ReturnType<typeof createApiClient>
