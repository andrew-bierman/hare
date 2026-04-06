/**
 * Memory Hooks
 *
 * React Query hooks for agent vector memory operations.
 * Uses Eden Treaty for type-safe API calls.
 */

import { api } from '@hare/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Helper to unwrap Eden Treaty response
async function unwrap<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
	const { data, error } = await promise
	if (error) throw error
	return data as T
}

// =============================================================================
// Types
// =============================================================================

export type MemoryType = 'fact' | 'context' | 'preference' | 'conversation' | 'custom'

export interface Memory {
	id: string
	content: string
	type: MemoryType
	source: string | null
	tags: string[]
	createdAt: string
}

export interface MemoryListResponse {
	memories: Memory[]
	total: number
}

export interface SearchResult {
	results: Array<{ memory: Memory; score: number }>
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
	list: (agentId: string) => [...memoryQueryKeys.lists(), agentId] as const,
	search: (agentId: string, query: string) =>
		[...memoryQueryKeys.all, 'search', agentId, query] as const,
}

// =============================================================================
// Hooks
// =============================================================================

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
			unwrap(api.api.memory({ id: agentId }).get({ query: { limit, offset } })),
		enabled,
	})
}

export function useCreateMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMemoryInput) =>
			unwrap(api.api.memory({ id: agentId }).post(data)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}

export function useSearchMemoriesMutation(options: { agentId: string }) {
	const { agentId } = options

	return useMutation({
		mutationFn: (data: SearchMemoryInput) =>
			unwrap(api.api.memory({ id: agentId }).search.post(data)),
	})
}

export function useUpdateMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: { memoryId: string; data: UpdateMemoryInput }) =>
			unwrap(api.api.memory({ id: agentId }).memories({ memoryId: input.memoryId }).patch(input.data)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}

export function useDeleteMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (memoryId: string) =>
			unwrap(api.api.memory({ id: agentId }).memories({ memoryId }).delete()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}

export function useClearMemoriesMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			unwrap(api.api.memory({ id: agentId }).clear.post({})),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}
