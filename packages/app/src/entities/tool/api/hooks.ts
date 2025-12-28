'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, type ToolTestRequest, type ToolTestResult } from '@shared/api'
import type { CreateToolInput, Tool } from '@shared/api'

export type { CreateToolInput, Tool, ToolType } from '@shared/api'
export type {
	HttpToolConfig,
	InputSchema,
	InputSchemaProperty,
	ToolTestRequest,
	ToolTestResult,
} from '@shared/api'

export const TOOL_TYPES = ['http', 'sql', 'kv', 'r2', 'custom'] as const

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

export function useTestTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: (data: ToolTestRequest) => apiClient.tools.test(workspaceId!, data),
	})
}

export function useTestExistingTool(workspaceId: string | undefined) {
	return useMutation({
		mutationFn: ({ id, testInput }: { id: string; testInput?: Record<string, unknown> }) =>
			apiClient.tools.testExisting(id, workspaceId!, testInput),
	})
}
