'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, type ToolTestRequest } from '@hare/api/client'
import type { CreateToolInput, ToolType } from '@hare/api'

// Re-export types for convenience
export type { HttpToolConfig, InputSchema, InputSchemaProperty, ToolTestResult } from '@hare/api/client'
export type { CreateToolInput, Tool, ToolType } from '@hare/api'

export function useTools(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId],
		queryFn: () => apiClient.tools.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useTool(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId, id],
		queryFn: () => apiClient.tools.get(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateToolInput) => apiClient.tools.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

export function useUpdateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateToolInput> }) =>
			apiClient.tools.update(id, workspaceId!, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId, id] })
		},
	})
}

export function useDeleteTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.tools.delete(id, workspaceId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

/**
 * Test an HTTP tool configuration before saving.
 */
export function useTestTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: (data: ToolTestRequest) => apiClient.tools.test(workspaceId!, data),
	})
}

/**
 * Test an existing HTTP tool with test input.
 */
export function useTestExistingTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: ({ id, testInput }: { id: string; testInput?: Record<string, unknown> }) =>
			apiClient.tools.testExisting(id, workspaceId!, testInput),
	})
}

// Tool type options for the UI - import from config instead
export const TOOL_TYPES: { value: ToolType; label: string; description: string }[] = [
	{ value: 'http', label: 'HTTP Request', description: 'Make HTTP requests to external APIs' },
	{ value: 'sql', label: 'SQL Query', description: 'Execute read-only SQL queries' },
	{ value: 'kv', label: 'Key-Value Store', description: 'Store and retrieve key-value data' },
	{ value: 'r2', label: 'Object Storage', description: 'Store and retrieve files' },
	{ value: 'custom', label: 'Custom', description: 'Custom tool implementation' },
]
