/**
 * Server Functions Pattern
 *
 * This module documents the pattern for creating type-safe server functions
 * that wrap the Hono API using TanStack Start's createServerFn.
 *
 * TanStack Start server functions provide:
 * - End-to-end type safety between client and server
 * - Automatic request/response serialization
 * - Integration with TanStack Query for caching
 *
 * @example Usage in a route loader:
 * ```ts
 * // In a route file
 * import { createServerFn } from '@tanstack/react-start/server'
 *
 * const getAgent = createServerFn({ method: 'GET' })
 *   .validator((input: { id: string; workspaceId: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { apiClient } = await import('@hare/api/client')
 *     return apiClient.agents.get(data.id, data.workspaceId)
 *   })
 *
 * // In a route component with loader
 * export const Route = createFileRoute('/dashboard/agents/$id')({
 *   loader: async ({ params }) => {
 *     const agent = await getAgent({ id: params.id, workspaceId })
 *     return { agent }
 *   },
 *   component: AgentPage,
 * })
 * ```
 *
 * @see https://tanstack.com/start/latest/docs/framework/react/server-functions
 */

// Re-export the API client for use in server functions
export { apiClient } from '@hare/api/client'

/**
 * Helper type for server function input validation
 */
export interface ServerFnInput<T> {
	data: T
}

/**
 * Common server function patterns:
 *
 * 1. List resources:
 * const listAgents = createServerFn({ method: 'GET' })
 *   .validator((input: { workspaceId: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { apiClient } = await import('@hare/api/client')
 *     return apiClient.agents.list(data.workspaceId)
 *   })
 *
 * 2. Get single resource:
 * const getAgent = createServerFn({ method: 'GET' })
 *   .validator((input: { id: string; workspaceId: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { apiClient } = await import('@hare/api/client')
 *     return apiClient.agents.get(data.id, data.workspaceId)
 *   })
 *
 * 3. Create resource:
 * const createAgent = createServerFn({ method: 'POST' })
 *   .validator((input: { workspaceId: string; data: CreateAgentInput }) => input)
 *   .handler(async ({ data }) => {
 *     const { apiClient } = await import('@hare/api/client')
 *     return apiClient.agents.create(data.workspaceId, data.data)
 *   })
 *
 * 4. Update resource:
 * const updateAgent = createServerFn({ method: 'POST' })
 *   .validator((input: { id: string; workspaceId: string; data: UpdateAgentInput }) => input)
 *   .handler(async ({ data }) => {
 *     const { apiClient } = await import('@hare/api/client')
 *     return apiClient.agents.update(data.id, data.workspaceId, data.data)
 *   })
 *
 * 5. Delete resource:
 * const deleteAgent = createServerFn({ method: 'POST' })
 *   .validator((input: { id: string; workspaceId: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { apiClient } = await import('@hare/api/client')
 *     return apiClient.agents.delete(data.id, data.workspaceId)
 *   })
 */

/**
 * Server function for route loaders pattern:
 *
 * Using server functions in route loaders provides:
 * - Data fetching before component renders
 * - Automatic prefetching on link hover
 * - Type-safe loader data in components
 *
 * @example
 * ```ts
 * export const Route = createFileRoute('/_dashboard/dashboard/agents/$id')({
 *   loader: async ({ params, context }) => {
 *     const workspaceId = context.activeWorkspaceId
 *     const agent = await getAgent({ id: params.id, workspaceId })
 *     return { agent }
 *   },
 *   component: function AgentPage() {
 *     const { agent } = Route.useLoaderData()
 *     return <div>{agent.name}</div>
 *   },
 * })
 * ```
 */
