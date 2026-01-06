/**
 * oRPC Type-Safe Client
 *
 * Provides end-to-end type safety from server to client.
 * Types are automatically inferred from the server router.
 */

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { AppRouter } from './routers'

/**
 * Type-safe client type derived from the app router.
 */
export type AppRouterClient = RouterClient<AppRouter>

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
 * import { orpc } from '@hare/api/orpc'
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
export const orpc = createORPCClient<AppRouterClient>(link)

// Export individual router types for more specific imports
export type AgentsClient = AppRouterClient['agents']
export type ToolsClient = AppRouterClient['tools']
export type ApiKeysClient = AppRouterClient['apiKeys']
export type WorkspacesClient = AppRouterClient['workspaces']
export type SchedulesClient = AppRouterClient['schedules']
export type UsageClient = AppRouterClient['usage']
export type AnalyticsClient = AppRouterClient['analytics']
export type LogsClient = AppRouterClient['logs']
export type MemoryClient = AppRouterClient['memory']
export type ChatClient = AppRouterClient['chat']
export type BillingClient = AppRouterClient['billing']
export type UserSettingsClient = AppRouterClient['userSettings']
export type WorkspaceMembersClient = AppRouterClient['workspaceMembers']
