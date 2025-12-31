/**
 * Memory Hooks
 *
 * React Query hooks for agent vector memory operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@hare/api-client'

// =============================================================================
// Types
// =============================================================================

export type MemoryType = 'fact' | 'context' | 'preference' | 'conversation' | 'custom'

export interface Memory {
	id: string
	content: string
	metadata: {
		agentId: string
		workspaceId: string
		type: MemoryType
		source?: string
		createdAt: string
		updatedAt?: string
		tags?: string[]
	}
	score?: number
}

export interface MemoryListResponse {
	memories: Memory[]
	total: number
	limit: number
	offset: number
}

export interface SearchResult {
	memories: Memory[]
	query: string
	topK: number
}

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
	list: (agentId: string, workspaceId: string) =>
		[...memoryQueryKeys.lists(), agentId, workspaceId] as const,
	search: (agentId: string, workspaceId: string, query: string) =>
		[...memoryQueryKeys.all, 'search', agentId, workspaceId, query] as const,
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch memories for an agent.
 */
export function useMemoriesQuery(options: {
	agentId: string
	workspaceId?: string
	limit?: number
	offset?: number
	enabled?: boolean
}) {
	const { agentId, workspaceId, limit = 20, offset = 0, enabled = true } = options

	return useQuery({
		queryKey: memoryQueryKeys.list(agentId, workspaceId || ''),
		queryFn: async () => {
			const res = await api.agents[':id'].memories.$get({
				param: { id: agentId },
				query: {
					workspaceId: workspaceId!,
					limit: limit.toString(),
					offset: offset.toString(),
				},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: enabled && !!workspaceId,
	})
}

/**
 * Create a new memory.
 */
export function useCreateMemoryMutation(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: CreateMemoryInput) => {
			const res = await api.agents[':id'].memories.$post({
				param: { id: agentId },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}

/**
 * Search memories.
 */
export function useSearchMemoriesMutation(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options

	return useMutation({
		mutationFn: async (data: SearchMemoryInput) => {
			const res = await api.agents[':id'].memories.search.$post({
				param: { id: agentId },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
	})
}

/**
 * Update a memory.
 */
export function useUpdateMemoryMutation(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (input: { memoryId: string; data: UpdateMemoryInput }) => {
			const res = await api.agents[':id'].memories[':memoryId'].$patch({
				param: { id: agentId, memoryId: input.memoryId },
				query: { workspaceId: workspaceId! },
				json: input.data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}

/**
 * Delete a memory.
 */
export function useDeleteMemoryMutation(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (memoryId: string) => {
			const res = await api.agents[':id'].memories[':memoryId'].$delete({
				param: { id: agentId, memoryId },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}

/**
 * Clear all memories for an agent.
 */
export function useClearMemoriesMutation(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			const res = await api.agents[':id'].memories.$delete({
				param: { id: agentId },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryQueryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}
