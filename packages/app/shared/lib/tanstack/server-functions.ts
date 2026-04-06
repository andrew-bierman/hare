/**
 * Server Functions Pattern
 *
 * This module documents the pattern for creating type-safe server functions
 * using TanStack Start's createServerFn with Eden Treaty.
 *
 * For most API calls, use the Eden Treaty client directly:
 * ```ts
 * import { client } from '@hare/api/client'
 *
 * // Fully type-safe - types inferred from server
 * const { data } = await client.api.agents.get()
 * const { data: agent } = await client.api.agents({ id: 'agent-123' }).get()
 * ```
 *
 * TanStack Start server functions are useful for:
 * - SSR data loading in route loaders
 * - Server-side operations that need request context
 *
 * @example Usage in a route loader:
 * ```ts
 * import { createServerFn } from '@tanstack/react-start/server'
 * import { client } from '@hare/api/client'
 *
 * const getAgent = createServerFn({ method: 'GET' })
 *   .validator((input: { id: string }) => input)
 *   .handler(async ({ data }) => {
 *     const { data: agent } = await client.api.agents({ id: data.id }).get()
 *     return agent
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
 * Common Eden Treaty patterns (no server functions needed for most cases):
 *
 * ```ts
 * import { client } from '@hare/api/client'
 *
 * // 1. List resources - types fully inferred
 * const { data } = await client.api.agents.get()
 *
 * // 2. Get single resource
 * const { data: agent } = await client.api.agents({ id: 'agent-123' }).get()
 *
 * // 3. Create resource - input validated at compile time
 * const { data: created } = await client.api.agents.post({
 *   name: 'My Agent',
 *   model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
 *   instructions: 'You are a helpful assistant.',
 * })
 *
 * // 4. Update resource
 * const { data: updated } = await client.api.agents({ id: 'agent-123' }).patch({
 *   name: 'Updated Name',
 * })
 *
 * // 5. Delete resource
 * const { data } = await client.api.agents({ id: 'agent-123' }).delete()
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
 * import { client } from '@hare/api/client'
 *
 * export const Route = createFileRoute('/_dashboard/dashboard/agents/$id')({
 *   loader: async ({ params }) => {
 *     const { data: agent } = await client.api.agents({ id: params.id }).get()
 *     return { agent }
 *   },
 *   component: function AgentPage() {
 *     const { agent } = Route.useLoaderData()
 *     return <div>{agent.name}</div>
 *   },
 * })
 * ```
 */
