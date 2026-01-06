/**
 * Memory Hooks
 *
 * React Query hooks for agent vector memory operations.
 * Uses oRPC for type-safe API calls.
 *
 * Note: workspaceId is determined by server context from the authenticated session.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@hare/api-client'

// =============================================================================
// Types (inferred from oRPC)
// =============================================================================

type MemoryListOutput = Awaited<ReturnType<typeof orpc.memory.list>>
type MemoryOutput = MemoryListOutput['memories'][number]
type SearchOutput = Awaited<ReturnType<typeof orpc.memory.search>>

export type MemoryType = 'fact' | 'context' | 'preference' | 'conversation' | 'custom'
export type Memory = MemoryOutput
export type MemoryListResponse = MemoryListOutput
export type SearchResult = SearchOutput

export interface CreateMemoryInput {
	content: string
	type?: MemoryType
	source?: string
	tags?: string[]
}

export interface UpdateMemoryInput {
	content: string
	type?: MemoryType
	tags?: string[]
}

export interface SearchMemoryInput {
	query: string
	topK?: number
	type?: MemoryType
	tags?: string[]
}

// =============================================================================
// Query Keys
// =============================================================================

export const memoryQueryKeys = {
	all: ['memories'] as const,
	lists: () => [...memoryQueryKeys.all, 'list'] as const,
	list: (agentId: string) => [...memoryQueryKeys.lists(), agentId] as const,
	search: (agentId: string, query: string) =>
		[...memoryQueryKeys.all, 'search', agentId, query] as const,
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch memories for an agent.
 */
export function useMemoriesQuery(options: {
	agentId: string
	limit?: number
	offset?: number
	enabled?: boolean
}) {
	const { agentId, limit = 20, offset = 0, enabled = true } = options

	return useQuery({
		queryKey: memoryQueryKeys.list(agentId),
		queryFn: () =>
			orpc.memory.list({
				id: agentId,
				limit,
				offset,
			}),
		enabled,
	})
}

/**
 * Create a new memory.
 */
export function useCreateMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMemoryInput) =>
			orpc.memory.create({
				id: agentId,
				content: data.content,
				type: data.type,
				source: data.source,
				tags: data.tags,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId),
			})
		},
	})
}

/**
 * Search memories.
 */
export function useSearchMemoriesMutation(options: { agentId: string }) {
	const { agentId } = options

	return useMutation({
		mutationFn: (data: SearchMemoryInput) =>
			orpc.memory.search({
				id: agentId,
				query: data.query,
				topK: data.topK,
				type: data.type,
				tags: data.tags,
			}),
	})
}

/**
 * Update a memory.
 */
export function useUpdateMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: { memoryId: string; data: UpdateMemoryInput }) =>
			orpc.memory.update({
				id: agentId,
				memoryId: input.memoryId,
				content: input.data.content,
				type: input.data.type,
				tags: input.data.tags,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId),
			})
		},
	})
}

/**
 * Delete a memory.
 */
export function useDeleteMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (memoryId: string) =>
			orpc.memory.delete({
				id: agentId,
				memoryId,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId),
			})
		},
	})
}

/**
 * Clear all memories for an agent.
 */
export function useClearMemoriesMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			orpc.memory.clear({
				id: agentId,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId),
			})
		},
	})
}
