'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ToolType } from '@hare/types'
import { tools } from '@hare/api-client'
import { toolKeys } from './query-keys'

// Infer types from the API client for proper type compatibility
type ApiToolsResponse = Awaited<ReturnType<Awaited<ReturnType<typeof tools.$get>>['json']>>
type ApiTool = ApiToolsResponse['tools'][number]
type ApiCreateToolInput = Parameters<typeof tools.$post>[0]['json']

/**
 * Query options for listing tools in a workspace.
 */
export const toolsQueryOptions = (workspaceId: string) =>
	queryOptions({
		queryKey: toolKeys.list(workspaceId),
		queryFn: async () => {
			const res = await tools.$get({ query: { workspaceId } })
			if (!res.ok) {
				throw new Error(`Failed to fetch tools: ${res.status}`)
			}
			return res.json()
		},
	})

/**
 * Query options for fetching a single tool.
 */
export const toolQueryOptions = (options: { id: string; workspaceId: string }) =>
	queryOptions({
		queryKey: toolKeys.detail(options.workspaceId, options.id),
		queryFn: async () => {
			const res = await tools[':id'].$get({
				param: { id: options.id },
				query: { workspaceId: options.workspaceId },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
		mutationFn: async (data: ApiCreateToolInput) => {
			const res = await tools.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
		},
	})
}

export function useUpdateToolMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<ApiCreateToolInput> }) => {
			const res = await tools[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
			queryClient.invalidateQueries({ queryKey: toolKeys.detail(workspaceId ?? '', id) })
		},
	})
}

export function useDeleteToolMutation(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await tools[':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		// Optimistic update
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: toolKeys.list(workspaceId ?? '') })
			const previousTools = queryClient.getQueryData<ApiToolsResponse>(
				toolKeys.list(workspaceId ?? ''),
			)
			if (previousTools) {
				queryClient.setQueryData<ApiToolsResponse>(toolKeys.list(workspaceId ?? ''), {
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

// Infer test tool input type from API
type ApiTestToolInput = Parameters<typeof tools.test.$post>[0]['json']

/**
 * Test an HTTP tool configuration before saving.
 */
export function useTestToolMutation(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: async (data: ApiTestToolInput) => {
			const res = await tools.test.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
	})
}

/**
 * Test an existing HTTP tool with test input.
 */
export function useTestExistingToolMutation(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: async ({ id, testInput }: { id: string; testInput?: Record<string, unknown> }) => {
			const res = await tools[':id'].test.$post({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: { testInput },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
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
