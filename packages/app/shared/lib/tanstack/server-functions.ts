/**
 * Server Functions Pattern
 *
 * This module documents the pattern for creating type-safe server functions
 * using TanStack Start's createServerFn with oRPC.
 *
 * For most API calls, use the oRPC client directly:
 * ```ts
 * import { orpc } from '@hare/api'
 *
 * // Fully type-safe - types inferred from server
 * const { agents } = await orpc.agents.list({})
 * const agent = await orpc.agents.get({ id: 'agent-123' })
 * ```
 *
 * TanStack Start server functions are useful for:
 * - SSR data loading in route loaders
 * - Server-side operations that need request context
 *
 * @example Usage in a route loader:
 * ```ts
 * import { createServerFn } from '@tanstack/react-start/server'
 * import { orpc } from '@hare/api'
 *
 * const getAgent = createServerFn({ method: 'GET' })
 *   .validator((input: { id: string }) => input)
 *   .handler(async ({ data }) => {
 *     return orpc.agents.get({ id: data.id })
 *   })
 *
 * export const Route = createFileRoute('/dashboard/agents/$id')({
 *   loader: async ({ params }) => {
 *     const agent = await getAgent({ id: params.id })
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
 * Common oRPC patterns (no server functions needed for most cases):
 *
 * ```ts
 * import { orpc } from '@hare/api'
 *
 * // 1. List resources - types fully inferred
 * const { agents } = await orpc.agents.list({})
 *
 * // 2. Get single resource
 * const agent = await orpc.agents.get({ id: 'agent-123' })
 *
 * // 3. Create resource - input validated at compile time
 * const created = await orpc.agents.create({
 *   name: 'My Agent',
 *   model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
 *   instructions: 'You are a helpful assistant.',
 * })
 *
 * // 4. Update resource
 * const updated = await orpc.agents.update({
 *   id: 'agent-123',
 *   name: 'Updated Name',
 * })
 *
 * // 5. Delete resource
 * const { success } = await orpc.agents.delete({ id: 'agent-123' })
 * ```
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
 * import { orpc } from '@hare/api'
 *
 * export const Route = createFileRoute('/_dashboard/dashboard/agents/$id')({
 *   loader: async ({ params }) => {
 *     const agent = await orpc.agents.get({ id: params.id })
 *     return { agent }
 *   },
 *   component: function AgentPage() {
 *     const { agent } = Route.useLoaderData()
 *     return <div>{agent.name}</div>
 *   },
 * })
 * ```
 */
