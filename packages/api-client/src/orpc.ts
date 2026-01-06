/**
 * oRPC Type-Safe Client
 *
 * Provides end-to-end type safety from server to client.
 * Types are automatically inferred from the server router.
 */

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { AppRouter } from '@hare/api/orpc'

/**
 * Get the base URL for API requests
 */
function getBaseURL(): string {
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	// Server-side fallback
	return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Create the RPC link with credentials
 */
const link = new RPCLink({
	url: `${getBaseURL()}/api/rpc`,
	fetch: (input, init) =>
		fetch(input, {
			...init,
			credentials: 'include',
		}),
})

/**
 * Type-safe oRPC client
 *
 * @example
 * ```ts
 * import { orpc } from '@hare/api-client/orpc'
 *
 * // List agents - types fully inferred!
 * const { agents } = await orpc.agents.list({})
 * //     ^? Agent[]
 *
 * // Get single agent
 * const agent = await orpc.agents.get({ id: 'agent-123' })
 * //    ^? Agent
 *
 * // Create agent - input validated at compile time
 * const created = await orpc.agents.create({
 *   name: 'My Agent',
 *   model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
 *   instructions: 'You are a helpful assistant.',
 * })
 *
 * // Update agent
 * const updated = await orpc.agents.update({
 *   id: 'agent-123',
 *   name: 'Updated Name',
 * })
 *
 * // Delete agent
 * const { success } = await orpc.agents.delete({ id: 'agent-123' })
 * ```
 */
export const orpc = createORPCClient<AppRouter>(link)

// Re-export types for convenience
export type { AppRouter }

// Export individual router types for more specific imports
export type AgentsClient = typeof orpc.agents
export type ToolsClient = typeof orpc.tools
export type ApiKeysClient = typeof orpc.apiKeys
export type WorkspacesClient = typeof orpc.workspaces
export type SchedulesClient = typeof orpc.schedules
