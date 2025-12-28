'use client'

import type { CreateToolInput, Tool, ToolType } from '@hare/api'
import { apiClient, type ToolTestRequest } from '@hare/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toolKeys } from '@hare/app/shared'

// Re-export types for convenience
export type { CreateToolInput, Tool, ToolType } from '@hare/api'
export type {
	HttpToolConfig,
	InputSchema,
	InputSchemaProperty,
	ToolTestResult,
} from '@hare/api/client'

export function useTools(workspaceId: string | undefined) {
	return useQuery({
		queryKey: toolKeys.list(workspaceId ?? ''),
		queryFn: () => apiClient.tools.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useTool(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: toolKeys.detail(workspaceId ?? '', id ?? ''),
		queryFn: () => apiClient.tools.get(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateToolInput) => apiClient.tools.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
		},
	})
}

export function useUpdateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateToolInput> }) =>
			apiClient.tools.update(id, workspaceId!, data),
		// Optimistic update
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({ queryKey: toolKeys.detail(workspaceId ?? '', id) })
			const previousTool = queryClient.getQueryData<Tool>(toolKeys.detail(workspaceId ?? '', id))
			if (previousTool) {
				queryClient.setQueryData<Tool>(toolKeys.detail(workspaceId ?? '', id), {
					...previousTool,
					...data,
				})
			}
			return { previousTool }
		},
		onError: (_err, { id }, context) => {
			if (context?.previousTool) {
				queryClient.setQueryData(toolKeys.detail(workspaceId ?? '', id), context.previousTool)
			}
		},
		onSettled: (_, _err, { id }) => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
			queryClient.invalidateQueries({ queryKey: toolKeys.detail(workspaceId ?? '', id) })
		},
	})
}

export function useDeleteTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.tools.delete(id, workspaceId!),
		// Optimistic update
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
			const previousTools = queryClient.getQueryData<{ tools: Tool[] }>(
				toolKeys.list(workspaceId ?? ''),
			)
			if (previousTools) {
				queryClient.setQueryData<{ tools: Tool[] }>(toolKeys.list(workspaceId ?? ''), {
					tools: previousTools.tools.filter((tool) => tool.id !== id),
				})
			}
			return { previousTools }
		},
		onError: (_err, _id, context) => {
			if (context?.previousTools) {
				queryClient.setQueryData(toolKeys.list(workspaceId ?? ''), context.previousTools)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
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
