/**
 * Type-safe API Client
 *
 * Uses Hono's `hc` client for automatic type inference from routes.
 * Types are inferred from the route definitions - no manual type maintenance needed.
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
 * Create the type-safe Hono RPC client.
 * All types are automatically inferred from route definitions.
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
 * const res = await api.agents.$get({ query: { workspaceId } })
 * if (!res.ok) throw new Error('Failed to fetch agents')
 * const { agents } = await res.json()
 */
const client = createApiClient()
export const api = client.api

export type ApiClient = ReturnType<typeof createApiClient>
