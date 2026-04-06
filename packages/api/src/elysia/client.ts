/**
 * Eden Treaty Type-Safe Client
 *
 * End-to-end type safety between server and client.
 * Types are automatically inferred from the Elysia app — no code generation needed.
 *
 * @example
 * ```ts
 * import { api, setWorkspaceId } from '@hare/api/client'
 *
 * // Set workspace context
 * setWorkspaceId('ws-123')
 *
 * // Type-safe API calls
 * const { data } = await api.agents.get({ params: { id: 'agent-123' } })
 * const { data: agents } = await api.agents.index.get()
 * ```
 */

import { treaty } from '@elysiajs/eden'
import type { App } from './app'

// =============================================================================
// Workspace ID Management
// =============================================================================

let currentWorkspaceId: string | null = null

export function setWorkspaceId(workspaceId: string | null): void {
	currentWorkspaceId = workspaceId
}

export function getWorkspaceId(): string | null {
	return currentWorkspaceId
}

// =============================================================================
// Client Creation
// =============================================================================

function getBaseURL(): string {
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Type-safe Eden Treaty client.
 *
 * Automatically includes:
 * - Session cookies (credentials: include)
 * - X-Workspace-Id header when workspace is set
 */
export const api = treaty<App>(getBaseURL(), {
	fetch: { credentials: 'include' },
	headers(path, options) {
		const headers: Record<string, string> = {}
		if (currentWorkspaceId) {
			headers['X-Workspace-Id'] = currentWorkspaceId
		}
		return headers
	},
})

/**
 * Create a custom API client with a specific base URL.
 * Useful for SSR or testing.
 */
export function createApiClient(baseUrl: string) {
	return treaty<App>(baseUrl, {
		fetch: { credentials: 'include' },
		headers(path, options) {
			const headers: Record<string, string> = {}
			if (currentWorkspaceId) {
				headers['X-Workspace-Id'] = currentWorkspaceId
			}
			return headers
		},
	})
}

// Re-export the App type for use in other packages
export type { App } from './app'
