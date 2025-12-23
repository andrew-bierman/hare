'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import type { CreateAgentInput, UpdateAgentInput } from '../types'

// Re-export types for convenience
export type { Agent, CreateAgentInput, UpdateAgentInput } from '../types'

export function useAgents(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId],
		queryFn: () => apiClient.agents.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

export function useAgent(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId, id],
		queryFn: () => apiClient.agents.get(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateAgentInput) => apiClient.agents.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useUpdateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
			apiClient.agents.update(id, workspaceId!, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId, id] })
		},
	})
}

export function useDeleteAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.agents.delete(id, workspaceId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useDeployAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, version }: { id: string; version?: string }) =>
			apiClient.agents.deploy(id, workspaceId!, version),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId, id] })
		},
	})
}
