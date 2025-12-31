'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, handleResponse } from '../../../shared/api/client'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/types'

// Re-export types for convenience
export type { Agent, CreateAgentInput, UpdateAgentInput }

export function useAgents(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId],
		queryFn: async () => {
			const res = await api.agents.$get({ query: { workspaceId: workspaceId! } })
			return handleResponse(res)
		},
		enabled: !!workspaceId,
	})
}

export function useAgent(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId, id],
		queryFn: async () => {
			const res = await api.agents[':id'].$get({
				param: { id: id! },
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateAgentInput) => {
			const res = await api.agents.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useUpdateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateAgentInput }) => {
			const res = await api.agents[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			return handleResponse(res)
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId, id] })
		},
	})
}

export function useDeleteAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.agents[':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			return handleResponse(res)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useDeployAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, version }: { id: string; version?: string }) => {
			const res = await api.agents[':id'].deploy.$post({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: { version },
			})
			return handleResponse(res)
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId, id] })
		},
	})
}

/**
 * Hook to preview/validate agent configuration
 * Returns server-side validation with detailed errors and warnings
 */
export function useAgentPreview(options: {
	agentId: string | undefined
	workspaceId: string | undefined
}) {
	const { agentId, workspaceId } = options
	return useMutation({
		mutationFn: async (overrides?: CreateAgentInput) => {
			const res = await api.agents[':id'].preview.$post({
				param: { id: agentId! },
				query: { workspaceId: workspaceId! },
				json: overrides ?? {},
			})
			return handleResponse(res)
		},
	})
}

/**
 * Hook to get agent preview with auto-refresh on field changes
 * Useful for real-time validation in the agent builder
 */
export function useAgentPreviewQuery(options: {
	agentId: string | undefined
	workspaceId: string | undefined
	overrides?: CreateAgentInput
	enabled?: boolean
}) {
	const { agentId, workspaceId, overrides, enabled = true } = options

	return useQuery({
		queryKey: ['agent-preview', workspaceId, agentId, overrides],
		queryFn: async () => {
			const res = await api.agents[':id'].preview.$post({
				param: { id: agentId! },
				query: { workspaceId: workspaceId! },
				json: overrides ?? {},
			})
			return handleResponse(res)
		},
		enabled: enabled && !!agentId && !!workspaceId,
		staleTime: 30000,
		refetchOnWindowFocus: false,
	})
}
