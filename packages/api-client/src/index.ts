/**
 * @hare/api-client
 *
 * Type-safe Hono RPC client for the Hare API.
 * Uses Hono's `hc` client for automatic type inference from routes.
 */

import { hc } from 'hono/client'
import type { AppType } from '@hare/api'

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
 * Create a type-safe Hono RPC client.
 * All types are automatically inferred from route definitions.
 *
 * @param baseUrl - Optional base URL for the API. Defaults to auto-detection.
 * @returns The Hono RPC client with full type inference.
 */
export function createApiClient(baseUrl?: string) {
	return hc<AppType>(baseUrl ?? getBaseURL(), {
		init: { credentials: 'include' },
	})
}

/**
 * Default API client instance.
 * The `.api` accessor accounts for the basePath('/api') in the server routes.
 *
 * @example
 * ```ts
 * import { api } from '@hare/api-client'
 *
 * const res = await api.agents.$get({ query: { workspaceId } })
 * if (!res.ok) throw new Error('Failed to fetch agents')
 * const { agents } = await res.json()
 * ```
 */
const client = createApiClient()
export const api = client.api

/** Type of the API client */
export type ApiClient = ReturnType<typeof createApiClient>

/** Type of the api accessor (with basePath applied) */
export type Api = typeof api
