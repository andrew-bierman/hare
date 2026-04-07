'use client'

/**
 * Memory Hooks
 *
 * React Query hooks for agent vector memory operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

export const memoryKeys = {
	all: ['memories'] as const,
	lists: () => [...memoryKeys.all, 'list'] as const,
	list: (agentId: string, workspaceId: string) =>
		[...memoryKeys.lists(), agentId, workspaceId] as const,
	search: (agentId: string, workspaceId: string, query: string) =>
		[...memoryKeys.all, 'search', agentId, workspaceId, query] as const,
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchMemories(options: {
	agentId: string
	workspaceId: string
	limit?: number
	offset?: number
}): Promise<MemoryListResponse> {
	const { agentId, workspaceId, limit = 20, offset = 0 } = options

	const params = new URLSearchParams({
		workspaceId,
		limit: String(limit),
		offset: String(offset),
	})

	const response = await fetch(`/api/agents/${agentId}/memories?${params}`, {
		credentials: 'include',
	})

	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to fetch memories')
	}

	return response.json()
}

async function createMemory(options: {
	agentId: string
	workspaceId: string
	data: CreateMemoryInput
}): Promise<Memory> {
	const { agentId, workspaceId, data } = options

	const response = await fetch(`/api/agents/${agentId}/memories?workspaceId=${workspaceId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data),
	})

	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to create memory')
	}

	return response.json()
}

async function searchMemories(options: {
	agentId: string
	workspaceId: string
	data: SearchMemoryInput
}): Promise<SearchResult> {
	const { agentId, workspaceId, data } = options

	const response = await fetch(
		`/api/agents/${agentId}/memories/search?workspaceId=${workspaceId}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(data),
		},
	)

	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to search memories')
	}

	return response.json()
}

async function updateMemory(options: {
	agentId: string
	workspaceId: string
	memoryId: string
	data: UpdateMemoryInput
}): Promise<Memory> {
	const { agentId, workspaceId, memoryId, data } = options

	const response = await fetch(
		`/api/agents/${agentId}/memories/${memoryId}?workspaceId=${workspaceId}`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(data),
		},
	)

	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to update memory')
	}

	return response.json()
}

async function deleteMemory(options: {
	agentId: string
	workspaceId: string
	memoryId: string
}): Promise<void> {
	const { agentId, workspaceId, memoryId } = options

	const response = await fetch(
		`/api/agents/${agentId}/memories/${memoryId}?workspaceId=${workspaceId}`,
		{
			method: 'DELETE',
			credentials: 'include',
		},
	)

	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to delete memory')
	}
}

async function clearMemories(options: {
	agentId: string
	workspaceId: string
}): Promise<{ deleted: number }> {
	const { agentId, workspaceId } = options

	const response = await fetch(`/api/agents/${agentId}/memories?workspaceId=${workspaceId}`, {
		method: 'DELETE',
		credentials: 'include',
	})

	if (!response.ok) {
		const error = (await response.json()) as { error?: string }
		throw new Error(error.error || 'Failed to clear memories')
	}

	return response.json()
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch memories for an agent.
 */
export function useMemories(options: {
	agentId: string
	workspaceId?: string
	limit?: number
	offset?: number
	enabled?: boolean
}) {
	const { agentId, workspaceId, limit, offset, enabled = true } = options

	return useQuery({
		queryKey: memoryKeys.list(agentId, workspaceId || ''),
		queryFn: () =>
			fetchMemories({
				agentId,
				// biome-ignore lint/style/noNonNullAssertion: guarded by enabled && !!workspaceId
				workspaceId: workspaceId!,
				limit,
				offset,
			}),
		enabled: enabled && !!workspaceId,
	})
}

/**
 * Create a new memory.
 */
export function useCreateMemory(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateMemoryInput) =>
			createMemory({
				agentId,
				// biome-ignore lint/style/noNonNullAssertion: mutation only callable when workspaceId exists
				workspaceId: workspaceId!,
				data,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}

/**
 * Search memories.
 */
export function useSearchMemories(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options

	return useMutation({
		mutationFn: (data: SearchMemoryInput) =>
			searchMemories({
				agentId,
				// biome-ignore lint/style/noNonNullAssertion: mutation only callable when workspaceId exists
				workspaceId: workspaceId!,
				data,
			}),
	})
}

/**
 * Update a memory.
 */
export function useUpdateMemory(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: { memoryId: string; data: UpdateMemoryInput }) =>
			updateMemory({
				agentId,
				// biome-ignore lint/style/noNonNullAssertion: mutation only callable when workspaceId exists
				workspaceId: workspaceId!,
				memoryId: input.memoryId,
				data: input.data,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}

/**
 * Delete a memory.
 */
export function useDeleteMemory(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (memoryId: string) =>
			deleteMemory({
				agentId,
				// biome-ignore lint/style/noNonNullAssertion: mutation only callable when workspaceId exists
				workspaceId: workspaceId!,
				memoryId,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}

/**
 * Clear all memories for an agent.
 */
export function useClearMemories(options: { agentId: string; workspaceId?: string }) {
	const { agentId, workspaceId } = options
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			clearMemories({
				agentId,
				// biome-ignore lint/style/noNonNullAssertion: mutation only callable when workspaceId exists
				workspaceId: workspaceId!,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: memoryKeys.list(agentId, workspaceId || ''),
			})
		},
	})
}
