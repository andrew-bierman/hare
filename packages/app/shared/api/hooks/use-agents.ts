'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/types'
import type { AgentPreviewInput, AgentPreviewResponse } from '../client'
import { apiClient } from '../client'
import { agentKeys } from './query-keys'

/**
 * Query options for listing agents in a workspace.
 * Can be used with useQuery, prefetchQuery, or ensureQueryData.
 */
export const agentsQueryOptions = (workspaceId: string) =>
	queryOptions({
		queryKey: agentKeys.list(workspaceId),
		queryFn: () => apiClient.agents.list(workspaceId),
	})

/**
 * Query options for fetching a single agent.
 * Can be used with useQuery, prefetchQuery, or ensureQueryData.
 */
export const agentQueryOptions = (options: { id: string; workspaceId: string }) =>
	queryOptions({
		queryKey: agentKeys.detail(options.workspaceId, options.id),
		queryFn: () => apiClient.agents.get(options.id, options.workspaceId),
	})

/**
 * Query options for agent preview/validation.
 */
export const agentPreviewQueryOptions = (options: {
	agentId: string
	workspaceId: string
	overrides?: AgentPreviewInput
}) =>
	queryOptions({
		queryKey: agentKeys.preview(options.workspaceId, options.agentId, options.overrides),
		queryFn: () =>
			apiClient.agents.preview(options.agentId, options.workspaceId, options.overrides),
	})

/**
 * Hook to list all agents for a workspace
 */
export function useAgentsQuery(workspaceId: string | undefined) {
	return useQuery({
		...agentsQueryOptions(workspaceId!),
		enabled: !!workspaceId,
	})
}

/**
 * Hook to get a single agent
 */
export function useAgentQuery(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		...agentQueryOptions({ id: id!, workspaceId: workspaceId! }),
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
			...agentQueryOptions({ id, workspaceId }),
			staleTime: 30000,
		})
	}
}

/**
 * Hook to create a new agent with optimistic updates
 */
export function useCreateAgentMutation(workspaceId: string | undefined) {
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
export function useUpdateAgentMutation(workspaceId: string | undefined) {
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
export function useDeleteAgentMutation(workspaceId: string | undefined) {
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
export function useDeployAgentMutation(workspaceId: string | undefined) {
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
export function useAgentPreviewMutation(options: {
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
		queryKey: agentKeys.preview(workspaceId ?? '', agentId ?? '', overrides),
		queryFn: () => apiClient.agents.preview(agentId!, workspaceId!, overrides),
		enabled: enabled && !!agentId && !!workspaceId,
		staleTime: 30000,
		refetchOnWindowFocus: false,
	})
}
