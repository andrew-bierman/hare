'use client'

/**
 * TanStack DB Live Hooks for Agents
 *
 * These hooks use TanStack DB collections and live queries for:
 * - Reactive updates when data changes
 * - Built-in optimistic mutations with automatic rollback
 * - Simplified data management
 *
 * Note: These hooks are experimental and require TanStack DB.
 * The traditional useAgentsQuery/useAgentQuery hooks remain the stable option.
 *
 * @see https://tanstack.com/db/latest/docs/framework/react/overview
 */

import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery, eq } from '@tanstack/react-db'
import { useMemo, useCallback } from 'react'
import type { CreateAgentInput, UpdateAgentInput } from '@hare/types'
import { createAgentsCollection, type AgentRecord } from '../collections'

// Store collections in a WeakMap keyed by QueryClient to handle multiple clients
const collectionsMap = new WeakMap<
	object,
	Map<string, ReturnType<typeof createAgentsCollection>>
>()

function getOrCreateCollection(queryClient: object, workspaceId: string) {
	let workspaceMap = collectionsMap.get(queryClient)
	if (!workspaceMap) {
		workspaceMap = new Map()
		collectionsMap.set(queryClient, workspaceMap)
	}

	let collection = workspaceMap.get(workspaceId)
	if (!collection) {
		collection = createAgentsCollection(
			workspaceId,
			queryClient as Parameters<typeof createAgentsCollection>[1],
		)
		workspaceMap.set(workspaceId, collection)
	}

	return collection
}

/**
 * Hook to list all agents for a workspace using live queries.
 * Returns reactive data that automatically updates when agents change.
 *
 * IMPORTANT: workspaceId must be defined. Use standard useAgentsQuery for conditional loading.
 *
 * @example
 * ```tsx
 * function AgentList({ workspaceId }) {
 *   const { agents, isLoading } = useLiveAgents(workspaceId)
 *
 *   if (isLoading) return <Spinner />
 *   return agents.map(agent => <AgentCard key={agent.id} agent={agent} />)
 * }
 * ```
 */
export function useLiveAgents(workspaceId: string) {
	const queryClient = useQueryClient()

	const collection = useMemo(
		() => getOrCreateCollection(queryClient, workspaceId),
		[queryClient, workspaceId],
	)

	const result = useLiveQuery(
		(q) => q.from({ agents: collection }).select(({ agents }) => agents),
		[collection],
	)

	return {
		data: (result.data ?? []) as AgentRecord[],
		agents: (result.data ?? []) as AgentRecord[],
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to get a single agent by ID using live queries.
 *
 * IMPORTANT: Both id and workspaceId must be defined.
 *
 * @example
 * ```tsx
 * function AgentDetail({ workspaceId, agentId }) {
 *   const { agent, isLoading } = useLiveAgent(agentId, workspaceId)
 *
 *   if (isLoading) return <Spinner />
 *   if (!agent) return <NotFound />
 *   return <AgentEditor agent={agent} />
 * }
 * ```
 */
export function useLiveAgent(id: string, workspaceId: string) {
	const queryClient = useQueryClient()

	const collection = useMemo(
		() => getOrCreateCollection(queryClient, workspaceId),
		[queryClient, workspaceId],
	)

	const result = useLiveQuery(
		(q) =>
			q
				.from({ agents: collection })
				.where(({ agents }) => eq(agents.id, id))
				.select(({ agents }) => agents),
		[collection, id],
	)

	const agent = result.data?.[0] ?? null

	return {
		data: agent as AgentRecord | null,
		agent: agent as AgentRecord | null,
		isLoading: result.isLoading,
		isError: result.isError,
		collection,
	}
}

/**
 * Hook to get agent mutation functions.
 * Returns optimistic insert/update/delete functions that sync to server.
 *
 * @example
 * ```tsx
 * function CreateAgentButton({ workspaceId }) {
 *   const { createAgent, isReady } = useAgentMutations(workspaceId)
 *
 *   const handleCreate = () => {
 *     createAgent({ name: 'New Agent', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' })
 *   }
 *
 *   return <Button onClick={handleCreate} disabled={!isReady}>Create</Button>
 * }
 * ```
 */
export function useAgentMutations(workspaceId: string | undefined) {
	const queryClient = useQueryClient()

	const collection = useMemo(() => {
		if (!workspaceId) return null
		return getOrCreateCollection(queryClient, workspaceId)
	}, [queryClient, workspaceId])

	const createAgent = useCallback(
		(data: CreateAgentInput) => {
			if (!collection) throw new Error('No workspace selected')

			const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`

			return collection.insert({
				id: tempId,
				name: data.name,
				model: data.model,
				description: data.description ?? null,
				instructions: data.instructions ?? '',
				config: data.config ?? null,
				status: 'draft',
				workspaceId: workspaceId!,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		},
		[collection, workspaceId],
	)

	const updateAgent = useCallback(
		(id: string, data: UpdateAgentInput) => {
			if (!collection) throw new Error('No workspace selected')

			return collection.update(id, (draft) => {
				if (data.name !== undefined) draft.name = data.name
				if (data.model !== undefined) draft.model = data.model
				if (data.description !== undefined) draft.description = data.description ?? null
				if (data.instructions !== undefined) draft.instructions = data.instructions
				if (data.config !== undefined) draft.config = data.config ?? null
				draft.updatedAt = new Date().toISOString()
			})
		},
		[collection],
	)

	const deleteAgent = useCallback(
		(id: string) => {
			if (!collection) throw new Error('No workspace selected')
			return collection.delete(id)
		},
		[collection],
	)

	return {
		createAgent,
		updateAgent,
		deleteAgent,
		collection,
		isReady: !!collection,
	}
}

// Re-export for convenience
export { useLiveQuery, eq }
export type { AgentRecord }
