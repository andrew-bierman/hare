'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AgentPreviewInput, AgentPreviewResponse } from '@hare/api/client'
import { apiClient } from '@hare/api/client'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/api'
import { agentKeys } from 'web-app/lib/tanstack/query-keys'

export type { AgentPreviewInput, AgentPreviewResponse, ValidationIssue } from '@hare/api/client'
// Re-export types for convenience
export type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/api'

/**
 * Hook to list all agents for a workspace
 */
export function useAgents(workspaceId: string | undefined) {
	return useQuery({
		queryKey: agentKeys.list(workspaceId ?? ''),
		queryFn: () => apiClient.agents.list(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Hook to get a single agent
 */
export function useAgent(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: agentKeys.detail(workspaceId ?? '', id ?? ''),
		queryFn: () => apiClient.agents.get(id!, workspaceId!),
		enabled: !!id && !!workspaceId,
	})
}

/**
 * Hook to prefetch an agent (for route preloading)
 */
export function usePrefetchAgent() {
	const queryClient = useQueryClient()

	return (id: string, workspaceId: string) => {
		queryClient.prefetchQuery({
			queryKey: agentKeys.detail(workspaceId, id),
			queryFn: () => apiClient.agents.get(id, workspaceId),
			staleTime: 30000, // 30 seconds
		})
	}
}

/**
 * Hook to create a new agent with optimistic updates
 */
export function useCreateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: CreateAgentInput) => apiClient.agents.create(workspaceId!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId ?? '') })
		},
	})
}

/**
 * Hook to update an agent with optimistic updates
 */
export function useUpdateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
			apiClient.agents.update(id, workspaceId!, data),
		// Optimistic update
		onMutate: async ({ id, data }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: agentKeys.detail(workspaceId ?? '', id) })

			// Snapshot the previous value
			const previousAgent = queryClient.getQueryData<Agent>(
				agentKeys.detail(workspaceId ?? '', id),
			)

			// Optimistically update the cache
			if (previousAgent) {
				queryClient.setQueryData<Agent>(agentKeys.detail(workspaceId ?? '', id), {
					...previousAgent,
					...data,
					updatedAt: new Date().toISOString(),
				})
			}

			return { previousAgent }
		},
		// On error, rollback to the previous value
		onError: (_err, { id }, context) => {
			if (context?.previousAgent) {
				queryClient.setQueryData(
					agentKeys.detail(workspaceId ?? '', id),
					context.previousAgent,
				)
			}
		},
		// Always refetch after success or error
		onSettled: (_, _err, { id }) => {
			queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId ?? '') })
			queryClient.invalidateQueries({ queryKey: agentKeys.detail(workspaceId ?? '', id) })
		},
	})
}

/**
 * Hook to delete an agent with optimistic updates
 */
export function useDeleteAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => apiClient.agents.delete(id, workspaceId!),
		// Optimistic update - remove from list immediately
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: agentKeys.list(workspaceId ?? '') })

			const previousAgents = queryClient.getQueryData<{ agents: Agent[] }>(
				agentKeys.list(workspaceId ?? ''),
			)

			if (previousAgents) {
				queryClient.setQueryData<{ agents: Agent[] }>(agentKeys.list(workspaceId ?? ''), {
					agents: previousAgents.agents.filter((agent) => agent.id !== id),
				})
			}

			return { previousAgents }
		},
		onError: (_err, _id, context) => {
			if (context?.previousAgents) {
				queryClient.setQueryData(agentKeys.list(workspaceId ?? ''), context.previousAgents)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId ?? '') })
		},
	})
}

/**
 * Hook to deploy an agent
 */
export function useDeployAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, version }: { id: string; version?: string }) =>
			apiClient.agents.deploy(id, workspaceId!, version),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId ?? '') })
			queryClient.invalidateQueries({ queryKey: agentKeys.detail(workspaceId ?? '', id) })
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
