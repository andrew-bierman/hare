'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agents } from '@hare/api-client'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@hare/types'

// Re-export types for convenience
export type { Agent, CreateAgentInput, UpdateAgentInput }

export function useAgents(workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId],
		queryFn: async (): Promise<{ agents: Agent[] }> => {
			const res = await agents.index.$get({ query: { workspaceId: workspaceId! } })
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<{ agents: Agent[] }>
		},
		enabled: !!workspaceId,
	})
}

export function useAgent(id: string | undefined, workspaceId: string | undefined) {
	return useQuery({
		queryKey: ['agents', workspaceId, id],
		queryFn: async (): Promise<Agent> => {
			const res = await agents[':id'].$get({
				param: { id: id! },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<Agent>
		},
		enabled: !!id && !!workspaceId,
	})
}

export function useCreateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: CreateAgentInput): Promise<Agent> => {
			const res = await agents.index.$post({
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<Agent>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

export function useUpdateAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateAgentInput }): Promise<Agent> => {
			const res = await agents[':id'].$patch({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: data,
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<Agent>
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
		mutationFn: async (id: string): Promise<{ success: boolean }> => {
			const res = await agents[':id'].$delete({
				param: { id },
				query: { workspaceId: workspaceId! },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<{ success: boolean }>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents', workspaceId] })
		},
	})
}

interface DeploymentResponse {
	id: string
	agentId: string
	version: string
	url: string | null
	isActive: boolean
	deployedAt: string
	deactivatedAt: string | null
}

interface AgentPreviewResponse {
	valid: boolean
	errors: Array<{ field: string; message: string }>
	warnings: Array<{ field: string; message: string }>
	preview: {
		systemPrompt: string
		tools: string[]
		modelId: string
	} | null
}

export function useDeployAgent(workspaceId: string | undefined) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			id,
			version,
		}: { id: string; version?: string }): Promise<DeploymentResponse> => {
			const res = await agents[':id'].deploy.$post({
				param: { id },
				query: { workspaceId: workspaceId! },
				json: { version },
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<DeploymentResponse>
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
		mutationFn: async (overrides?: CreateAgentInput): Promise<AgentPreviewResponse> => {
			const res = await agents[':id'].preview.$post({
				param: { id: agentId! },
				query: { workspaceId: workspaceId! },
				json: overrides ?? {},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<AgentPreviewResponse>
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
		queryFn: async (): Promise<AgentPreviewResponse> => {
			const res = await agents[':id'].preview.$post({
				param: { id: agentId! },
				query: { workspaceId: workspaceId! },
				json: overrides ?? {},
			})
			if (!res.ok) throw new Error('Request failed')
			return res.json() as Promise<AgentPreviewResponse>
		},
		enabled: enabled && !!agentId && !!workspaceId,
		staleTime: 30000,
		refetchOnWindowFocus: false,
	})
}
