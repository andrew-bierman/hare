'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Helper to extract error message from API response
function getErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
		return error.error
	}
	return fallback
}

// Explicit types matching the API schema
export type ToolType = 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'

export interface Tool {
	id: string
	name: string
	description: string
	type: ToolType
	inputSchema: Record<string, unknown>
	config?: Record<string, unknown>
	code?: string
	isSystem: boolean
	createdAt: string
	updatedAt: string
}

export interface CreateToolInput {
	name: string
	description?: string
	type: ToolType
	inputSchema?: Record<string, unknown>
	config?: Record<string, unknown>
	code?: string
}

export interface UpdateToolInput {
	name?: string
	description?: string
	type?: ToolType
	inputSchema?: Record<string, unknown>
	config?: Record<string, unknown>
	code?: string
}

async function fetchTools(workspaceId: string, includeSystem = true): Promise<{ tools: Tool[] }> {
	const response = await fetch(
		`/api/tools?workspaceId=${workspaceId}&includeSystem=${includeSystem}`
	)
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch tools'))
	}
	return response.json()
}

async function fetchTool(id: string, workspaceId: string): Promise<Tool> {
	const response = await fetch(`/api/tools/${id}?workspaceId=${workspaceId}`)
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch tool'))
	}
	return response.json()
}

async function createTool(workspaceId: string, data: CreateToolInput): Promise<Tool> {
	const response = await fetch(`/api/tools?workspaceId=${workspaceId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to create tool'))
	}
	return response.json()
}

async function updateTool(id: string, workspaceId: string, data: UpdateToolInput): Promise<Tool> {
	const response = await fetch(`/api/tools/${id}?workspaceId=${workspaceId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to update tool'))
	}
	return response.json()
}

async function deleteTool(id: string, workspaceId: string): Promise<void> {
	const response = await fetch(`/api/tools/${id}?workspaceId=${workspaceId}`, {
		method: 'DELETE',
	})
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to delete tool'))
	}
}

export function useTools(workspaceId: string | undefined, includeSystem = true) {
	return useQuery({
		queryKey: ['tools', workspaceId, includeSystem],
		queryFn: () => fetchTools(workspaceId!, includeSystem),
		enabled: !!workspaceId,
	})
}

export function useTool(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId, id],
		queryFn: () => fetchTool(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateToolInput) => createTool(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

export function useUpdateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateToolInput }) =>
			updateTool(id, workspaceId!, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId, id] })
		},
	})
}

export function useDeleteTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => deleteTool(id, workspaceId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

// Tool type options for the UI
export const TOOL_TYPES: { value: ToolType; label: string; description: string }[] = [
	{ value: 'http', label: 'HTTP Request', description: 'Make HTTP requests to external APIs' },
	{ value: 'sql', label: 'SQL Query', description: 'Execute read-only SQL queries' },
	{ value: 'kv', label: 'Key-Value Store', description: 'Store and retrieve key-value data' },
	{ value: 'r2', label: 'Object Storage', description: 'Store and retrieve files' },
	{ value: 'vectorize', label: 'Semantic Search', description: 'Search using embeddings' },
	{ value: 'custom', label: 'Custom', description: 'Custom tool implementation' },
]
