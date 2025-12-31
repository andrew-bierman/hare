'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateToolInput, Tool, ToolType } from '@hare/types'
import { api, ApiClientError } from '../client'
import { toolKeys } from './query-keys'

/**
 * Helper to handle Hono RPC response with proper error handling.
 */
async function handleResponse<T>(res: Response & { json(): Promise<T> }): Promise<T> {
	if (!res.ok) {
		let errorMessage = `Request failed with status ${res.status}`
		let errorCode: string | undefined
		try {
			const error = (await res.json()) as { error: string; code?: string }
			errorMessage = error.error ?? errorMessage
			errorCode = error.code
		} catch {
			// Response wasn't JSON
		}
		throw new ApiClientError(errorMessage, res.status, errorCode)
	}
	return res.json()
}

/**
 * Query options for listing tools in a workspace.
 */
export const toolsQueryOptions = (workspaceId: string) =>
	queryOptions({
		queryKey: toolKeys.list(workspaceId),
		queryFn: async () => {
			const res = await api.tools.$get({ query: { workspaceId } })
			return handleResponse(res)
		},
	})

/**
 * Query options for fetching a single tool.
 */
export const toolQueryOptions = (options: { id: string; workspaceId: string }) =>
	queryOptions({
		queryKey: toolKeys.detail(options.workspaceId, options.id),
		queryFn: async () => {
			const res = await api.tools[':id'].$get({
				param: { id: options.id },
				query: { workspaceId: options.workspaceId },
			})
			return handleResponse(res)
		},
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
		mutationFn: async (data: CreateToolInput) => {
			const res = await api.tools.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
		},
	})
}

export function useUpdateToolMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<CreateToolInput> }) => {
			const res = await api.tools[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
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
		mutationFn: async (id: string) => {
			const res = await api.tools[':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
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
		mutationFn: async (data: {
			config: {
				url: string
				method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
				headers?: Record<string, string>
				body?: string
				bodyType?: 'json' | 'form' | 'text'
				timeout?: number
			}
			inputSchema?: {
				type: 'object'
				properties?: Record<string, unknown>
				required?: string[]
			}
			testInput?: Record<string, unknown>
		}) => {
			const res = await api.tools.test.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
	})
}

/**
 * Test an existing HTTP tool with test input.
 */
export function useTestExistingToolMutation(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: async ({ id, testInput }: { id: string; testInput?: Record<string, unknown> }) => {
			const res = await api.tools[':id'].test.$post({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: { testInput },
			})
			return handleResponse(res)
		},
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
