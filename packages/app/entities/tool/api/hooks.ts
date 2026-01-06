'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tools } from '@hare/api-client'
import type { ToolType } from '@hare/types'

// Infer types from the API client for proper type compatibility
type ApiToolsResponse = Awaited<
	ReturnType<Awaited<ReturnType<(typeof tools)['index']['$get']>>['json']>
>
type ApiTool = ApiToolsResponse['tools'][number]
type ApiCreateToolInput = Parameters<(typeof tools)['index']['$post']>[0]['json']

// Re-export types for convenience
export type { ToolType }
export type Tool = ApiTool
export type CreateToolInput = ApiCreateToolInput

export const TOOL_TYPES = ['http', 'sql', 'kv', 'r2', 'custom'] as const

export function useTools(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId],
		queryFn: async () => {
			const res = await tools.index.$get({ query: { workspaceId: workspaceId! } })
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!workspaceId,
	})
}

export function useTool(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId, id],
		queryFn: async () => {
			const res = await tools[':id'].$get({
				param: { id: id! },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateToolInput) => {
			const res = await tools.index.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

export function useUpdateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<CreateToolInput> }) => {
			const res = await tools[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId, id] })
		},
	})
}

export function useDeleteTool(workspaceId: string | undefined) {
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

// Infer test tool input type from API
type ApiTestToolInput = Parameters<(typeof tools)['test']['$post']>[0]['json']

export function useTestTool(workspaceId: string | undefined) {
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

export function useTestExistingTool(workspaceId: string | undefined) {
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
