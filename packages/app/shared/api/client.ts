/**
 * Type-safe API Client
 *
 * Uses Hono's `hc` client for automatic type inference from routes.
 * Types are inferred from the route definitions - no manual type maintenance needed.
 */

import { hc, type ClientResponse } from 'hono/client'
import type { AppType } from '@hare/api'

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

// =============================================================================
// Client Creation
// =============================================================================

/**
 * Get base URL for API requests.
 * Supports Vite environment variable (for Tauri) or falls back to window.location.origin.
 */
function getBaseURL(): string {
	if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
		return import.meta.env.VITE_API_URL as string
	}
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return ''
}

/**
 * Custom fetch that throws ApiClientError on non-2xx responses.
 * This allows hooks to just call `.json()` without checking `.ok`.
 */
const throwingFetch: typeof fetch = async (input, init) => {
	const res = await fetch(input, init)

	if (!res.ok) {
		let errorMessage = `Request failed with status ${res.status}`
		let errorCode: string | undefined

		try {
			const error = (await res.clone().json()) as { error?: string; code?: string }
			if (error.error) errorMessage = error.error
			errorCode = error.code
		} catch {
			// Response wasn't JSON
		}

		throw new ApiClientError(errorMessage, res.status, errorCode)
	}

	return res
}

/**
 * Create the type-safe Hono RPC client.
 * All types are automatically inferred from route definitions.
 * Uses custom fetch that throws on errors.
 */
export function createApiClient(baseUrl?: string) {
	return hc<AppType>(baseUrl ?? getBaseURL(), {
		init: { credentials: 'include' },
		fetch: throwingFetch,
	})
}

/**
 * Default API client instance.
 * The `.api` accessor accounts for the basePath('/api') in the server routes.
 *
 * @example
 * const res = await api.agents.$get({ query: { workspaceId } })
 * const { agents } = await res.json()
 */
const client = createApiClient()
export const api = client.api

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Infer the success response type from a ClientResponse union.
 * Extracts the data type from a 200/201 status response.
 */
type InferSuccessData<T> = T extends ClientResponse<infer D, 200, string>
	? D
	: T extends ClientResponse<infer D, 201, string>
		? D
		: never

/**
 * Helper to extract JSON with proper type narrowing.
 * Since throwingFetch already throws on errors, this just narrows the type.
 *
 * @example
 * const res = await api.agents.$get({ query: { workspaceId } })
 * const data = await handleResponse(res)
 * // data is typed as { agents: Agent[] }
 */
export async function handleResponse<T extends ClientResponse<unknown, number, string>>(
	response: T,
): Promise<InferSuccessData<T>> {
	// throwingFetch already threw if !response.ok, so this is always a success response
	return response.json() as Promise<InferSuccessData<T>>
}

// Re-export the client type for convenience
export type ApiClient = ReturnType<typeof createApiClient>
