/**
 * @hare/api-client
 *
 * Type-safe Hono RPC client for the Hare API.
 * Uses Hono's `hc` client with pre-compiled types for better IDE performance.
 *
 * @see https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
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
 * Pre-compiled client type for better IDE performance.
 * This allows TypeScript to resolve types at compile time rather than
 * during development, significantly improving IDE responsiveness.
 *
 * @see https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
 */
type Client = ReturnType<typeof hc<AppType>>

/**
 * Type-safe Hono client factory with pre-compiled types.
 * Use this instead of `hc` directly for proper type inference.
 */
function hcWithType(...args: Parameters<typeof hc>): Client {
	return hc<AppType>(...args)
}

/**
 * Create a type-safe Hono RPC client.
 * All types are automatically inferred from route definitions.
 *
 * @param baseUrl - Optional base URL for the API. Defaults to auto-detection.
 * @returns The Hono RPC client with full type inference.
 */
export function createApiClient(baseUrl?: string): Client {
	return hcWithType(baseUrl ?? getBaseURL(), {
		init: { credentials: 'include' },
	})
}

/**
 * Pre-compiled API type for the `/api` basePath.
 * This resolves the type once at compile time.
 */
type ApiType = Client['api']

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
export const api: ApiType = client.api

/** Type of the API client */
export type ApiClient = Client

/** Type of the api accessor (with basePath applied) */
export type Api = ApiType
