/**
 * Type-safe API Client
 *
 * Uses Hono's `hc` client for automatic type inference from routes.
 * Types are inferred from the route definitions - no manual type maintenance needed.
 */

import { hc, type ClientResponse } from 'hono/client'
import type { AppType } from '@hare/api'

// =============================================================================
// Client Creation
// =============================================================================

/**
 * Get base URL for API requests.
 * Supports Vite environment variable (for Tauri) or falls back to window.location.origin.
 */
function getBaseURL(): string {
	// Check for Vite environment variable (used by Tauri and other Vite apps)
	if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
		return import.meta.env.VITE_API_URL as string
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
		init: {
			credentials: 'include',
		},
	})
}

/**
 * Default API client instance.
 * The `.api` accessor accounts for the basePath('/api') in the server routes,
 * allowing clean access like `api.tools` instead of `client.api.tools`.
 */
const client = createApiClient()
export const api = client.api

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
 * Infer the success response type from a ClientResponse union.
 * Extracts the data type from a 200 status response.
 */
type InferSuccessData<T> = T extends ClientResponse<infer D, 200, string>
	? D
	: T extends ClientResponse<infer D, 201, string>
		? D
		: never

/**
 * Helper to handle response and extract JSON with proper error handling.
 * Works with Hono's ClientResponse type for full type inference.
 *
 * @example
 * const res = await api.agents.$get({ query: { workspaceId } })
 * const data = await handleResponse(res)
 * // data is typed as { agents: Agent[] }
 */
export async function handleResponse<T extends ClientResponse<unknown, number, string>>(
	response: T,
): Promise<InferSuccessData<T>> {
	if (!response.ok) {
		let errorMessage = `Request failed with status ${response.status}`
		let errorCode: string | undefined

		try {
			const error = (await response.clone().json()) as { error: string; code?: string }
			errorMessage = error.error
			errorCode = error.code
		} catch {
			// Response wasn't JSON, use default message
		}

		throw new ApiClientError(errorMessage, response.status, errorCode)
	}

	return response.json() as Promise<InferSuccessData<T>>
}

// Re-export the client type for convenience
export type ApiClient = ReturnType<typeof createApiClient>
