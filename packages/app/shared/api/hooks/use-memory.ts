/**
 * Memory Hooks
 *
 * React Query hooks for agent vector memory operations.
 * Uses Eden Treaty for type-safe API calls.
 */

import { client } from '@hare/api/client'
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

export interface MemoryMetadata {
	agentId: string
	workspaceId: string
	type: MemoryType
	source?: string | null
	createdAt: string
	updatedAt?: string
	tags?: string[]
}

export interface Memory {
	id: string
	content: string
	metadata: MemoryMetadata
	score?: number
}

export interface MemoryListResponse {
	memories: Memory[]
	total: number
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
	list: (agentId: string) => [...memoryQueryKeys.lists(), agentId] as const,
	search: (agentId: string, query: string) =>
		[...memoryQueryKeys.all, 'search', agentId, query] as const,
}

// =============================================================================
// Hooks
// =============================================================================

// Eden Treaty path mapping for memory routes (prefix /memory, flat paths):
// GET    /:id          -> client.api.memory({ id }).get({ query })
// POST   /:id          -> client.api.memory({ id }).post(body)
// POST   /:id/search   -> client.api.memory({ id }).search.post(body)
// PATCH  /:id/:memoryId -> client.api.memory({ id })({ memoryId }).patch(body)
// DELETE /:id/:memoryId -> client.api.memory({ id })({ memoryId }).delete()
// DELETE /:id          -> client.api.memory({ id }).delete()

export function useMemoriesQuery(options: {
	agentId: string
	limit?: number
	offset?: number
	enabled?: boolean
}) {
	const { agentId, limit = 20, offset = 0, enabled = true } = options

	return useQuery({
		queryKey: memoryQueryKeys.list(agentId),
		queryFn: () => unwrap(client.api.memory({ id: agentId }).get({ query: { limit, offset } as any })),
		enabled,
	})
}

export function useCreateMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMemoryInput) =>
			unwrap(client.api.memory({ id: agentId }).post(data as any)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}

export function useSearchMemoriesMutation(options: { agentId: string }) {
	const { agentId } = options

	return useMutation({
		mutationFn: (data: SearchMemoryInput) =>
			unwrap(client.api.memory({ id: agentId }).search.post(data as any)),
	})
}

export function useUpdateMemoryMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: { memoryId: string; data: UpdateMemoryInput }) =>
			unwrap(
				(client.api.memory({ id: agentId }) as any)({ memoryId: input.memoryId }).patch(input.data),
			),
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
			unwrap((client.api.memory({ id: agentId }) as any)({ memoryId }).delete()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}

export function useClearMemoriesMutation(options: { agentId: string }) {
	const { agentId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => unwrap(client.api.memory({ id: agentId }).delete()),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: memoryQueryKeys.list(agentId) })
		},
	})
}
