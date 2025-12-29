'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateToolInput, Tool, ToolType } from '@hare/types'
import { apiClient, type ToolTestRequest } from '../client'
import { toolKeys } from './query-keys'

/**
 * Query options for listing tools in a workspace.
 */
export const toolsQueryOptions = (workspaceId: string) =>
	queryOptions({
		queryKey: toolKeys.list(workspaceId),
		queryFn: () => apiClient.tools.list(workspaceId),
	})

/**
 * Query options for fetching a single tool.
 */
export const toolQueryOptions = (options: { id: string; workspaceId: string }) =>
	queryOptions({
		queryKey: toolKeys.detail(options.workspaceId, options.id),
		queryFn: () => apiClient.tools.get(options.id, options.workspaceId),
	})

export function useToolsQuery(workspaceId: string | undefined) {
	return useQuery({
		...toolsQueryOptions(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useToolQuery(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		...toolQueryOptions({ id: id!, workspaceId: workspaceId! }),
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateToolMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateToolInput) => apiClient.tools.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
		},
	})
}

export function useUpdateToolMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<CreateToolInput> }) =>
			apiClient.tools.update(id, workspaceId!, data),
		// Optimistic update
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({ queryKey: toolKeys.detail(workspaceId ?? '', id) })
			const previousTool = queryClient.getQueryData<Tool>(
				toolKeys.detail(workspaceId ?? '', id),
			)
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

export function useDeleteToolMutation(workspaceId: string | undefined) {
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
export function useTestToolMutation(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: (data: ToolTestRequest) => apiClient.tools.test(workspaceId!, data),
	})
}

/**
 * Test an existing HTTP tool with test input.
 */
export function useTestExistingToolMutation(workspaceId: string | undefined) {
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
