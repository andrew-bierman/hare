'use client'

import type { CreateAgentInput, UpdateAgentInput } from '@hare/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AgentPreviewInput, AgentPreviewResponse } from '@hare/api/client'
import { apiClient } from '@hare/api/client'
import type { CreateAgentInput, UpdateAgentInput } from '@hare/api'

export type { AgentPreviewInput, AgentPreviewResponse, ValidationIssue } from '@hare/api/client'
// Re-export types for convenience
export type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/api'

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
		mutationFn: (overrides?: AgentPreviewInput) =>
			apiClient.agents.preview(agentId!, workspaceId!, overrides),
	})
}

/**
 * Hook to get agent preview with auto-refresh on field changes
 * Useful for real-time validation in the agent builder
 */
export function useAgentPreviewQuery(options: {
	agentId: string | undefined
	workspaceId: string | undefined
	overrides?: AgentPreviewInput
	enabled?: boolean
}) {
	const { agentId, workspaceId, overrides, enabled = true } = options

	return useQuery<AgentPreviewResponse>({
		queryKey: ['agent-preview', workspaceId, agentId, overrides],
		queryFn: () => apiClient.agents.preview(agentId!, workspaceId!, overrides),
		enabled: enabled && !!agentId && !!workspaceId,
		staleTime: 30000, // 30 seconds - prevent too many requests
		refetchOnWindowFocus: false,
	})
}
