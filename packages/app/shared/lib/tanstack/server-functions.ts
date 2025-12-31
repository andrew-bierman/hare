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
 *     const { api, handleResponse } = await import('../api/client')
 *     const res = await api.agents[':id'].$get({
 *       param: { id: data.id },
 *       query: { workspaceId: data.workspaceId },
 *     })
 *     return handleResponse(res)
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
 *     const { api, handleResponse } = await import('../api/client')
 *     const res = await api.agents.$get({ query: { workspaceId: data.workspaceId } })
 *     return handleResponse(res)
 *   })
 *
 * 2. Get single resource:
 * const getAgent = createServerFn({ method: 'GET' })
 *   .validator((input: { id: string; workspaceId: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { api, handleResponse } = await import('../api/client')
 *     const res = await api.agents[':id'].$get({
 *       param: { id: data.id },
 *       query: { workspaceId: data.workspaceId },
 *     })
 *     return handleResponse(res)
 *   })
 *
 * 3. Create resource:
 * const createAgent = createServerFn({ method: 'POST' })
 *   .validator((input: { workspaceId: string; data: CreateAgentInput }) => input)
 *   .handler(async ({ data }) => {
 *     const { api, handleResponse } = await import('../api/client')
 *     const res = await api.agents.$post({
 *       query: { workspaceId: data.workspaceId },
 *       json: data.data,
 *     })
 *     return handleResponse(res)
 *   })
 *
 * 4. Update resource:
 * const updateAgent = createServerFn({ method: 'POST' })
 *   .validator((input: { id: string; workspaceId: string; data: UpdateAgentInput }) => input)
 *   .handler(async ({ data }) => {
 *     const { api, handleResponse } = await import('../api/client')
 *     const res = await api.agents[':id'].$patch({
 *       param: { id: data.id },
 *       query: { workspaceId: data.workspaceId },
 *       json: data.data,
 *     })
 *     return handleResponse(res)
 *   })
 *
 * 5. Delete resource:
 * const deleteAgent = createServerFn({ method: 'POST' })
 *   .validator((input: { id: string; workspaceId: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { api, handleResponse } = await import('../api/client')
 *     const res = await api.agents[':id'].$delete({
 *       param: { id: data.id },
 *       query: { workspaceId: data.workspaceId },
 *     })
 *     return handleResponse(res)
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
