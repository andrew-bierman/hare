'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@hare/api-client'
import type { CreateToolInput, Tool, ToolType } from '@hare/types'

// Re-export types for convenience
export type { Tool, ToolType, CreateToolInput }

export const TOOL_TYPES = ['http', 'sql', 'kv', 'r2', 'custom'] as const

export function useTools(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId],
		queryFn: async () => {
			const res = await api.tools.$get({ query: { workspaceId: workspaceId! } })
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
			const res = await api.tools[':id'].$get({
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
			const res = await api.tools.$post({
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
			const res = await api.tools[':id'].$patch({
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
			const res = await api.tools[':id'].$delete({
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

export function useTestTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: async (
			data: Parameters<typeof api.tools.test.$post>[0]['json'],
		) => {
			const res = await api.tools.test.$post({
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
			const res = await api.tools[':id'].test.$post({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: { testInput },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json()
		},
	})
}
