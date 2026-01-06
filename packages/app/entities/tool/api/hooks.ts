'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tools } from '@hare/api-client'
import type { Tool, CreateToolInput, ToolType } from '@hare/types'

// Re-export types for convenience
export type { Tool, CreateToolInput, ToolType }

export const TOOL_TYPES = ['http', 'sql', 'kv', 'r2', 'custom'] as const

export function useTools(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId],
		queryFn: async (): Promise<{ tools: Tool[] }> => {
			const res = await tools.index.$get({ query: { workspaceId: workspaceId! } })
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<{ tools: Tool[] }>
		},
		enabled: !!workspaceId,
	})
}

export function useTool(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['tools', workspaceId, id],
		queryFn: async (): Promise<Tool> => {
			const res = await tools[':id'].$get({
				param: { id: id! },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<Tool>
		},
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateToolInput): Promise<Tool> => {
			const res = await tools.index.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<Tool>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

export function useUpdateTool(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: { id: string; data: Partial<CreateToolInput> }): Promise<Tool> => {
			const res = await tools[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<Tool>
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
		mutationFn: async (id: string): Promise<{ success: boolean }> => {
			const res = await tools[':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<{ success: boolean }>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tools', workspaceId] })
		},
	})
}

// Test tool types
interface TestToolInput {
	name: string
	type: string
	config: Record<string, unknown>
	testInput?: Record<string, unknown>
}

interface TestToolResult {
	success: boolean
	result?: unknown
	error?: string
	duration?: number
}

export function useTestTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: async (data: TestToolInput): Promise<TestToolResult> => {
			const res = await tools.test.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<TestToolResult>
		},
	})
}

export function useTestExistingTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: async ({
			id,
			testInput,
		}: { id: string; testInput?: Record<string, unknown> }): Promise<TestToolResult> => {
			const res = await tools[':id'].test.$post({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: { testInput },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<TestToolResult>
		},
	})
}
