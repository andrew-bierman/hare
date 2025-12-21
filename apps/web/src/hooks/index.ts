'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType, InferRequestType } from 'hono/client'
import { client } from 'web-app/lib/client'

/**
 * Type-safe API hooks using Hono RPC.
 *
 * Types are automatically inferred from the API routes via hc<AppType>().
 * See: https://hono.dev/docs/guides/rpc
 */

// Infer types from client routes
type AgentsRoute = typeof client.api.agents
type AgentRoute = (typeof client.api.agents)[':id']
type AgentDeployRoute = (typeof client.api.agents)[':id']['deploy']
type WorkspacesRoute = typeof client.api.workspaces
type WorkspaceRoute = (typeof client.api.workspaces)[':id']
type ToolsRoute = typeof client.api.tools
type ToolRoute = (typeof client.api.tools)[':id']
type UsageRoute = typeof client.api.usage
type AgentUsageRoute = (typeof client.api.usage)['agents'][':id']

// Query keys factory
export const queryKeys = {
	agents: {
		all: ['agents'] as const,
		detail: (id: string) => ['agents', id] as const,
	},
	workspaces: {
		all: ['workspaces'] as const,
		detail: (id: string) => ['workspaces', id] as const,
	},
	tools: {
		all: ['tools'] as const,
		detail: (id: string) => ['tools', id] as const,
	},
	usage: {
		workspace: (params?: {
			startDate?: string
			endDate?: string
			agentId?: string
			groupBy?: string
		}) => ['usage', 'workspace', params] as const,
		agent: (id: string) => ['usage', 'agent', id] as const,
	},
}

// Agent hooks
export function useAgents() {
	return useQuery({
		queryKey: queryKeys.agents.all,
		queryFn: async () => {
			const res = await client.api.agents.$get()
			if (!res.ok) throw new Error('Failed to fetch agents')
			return res.json()
		},
	})
}

export function useAgent(id: string) {
	return useQuery({
		queryKey: queryKeys.agents.detail(id),
		queryFn: async () => {
			const res = await client.api.agents[':id'].$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch agent')
			return res.json()
		},
		enabled: !!id,
	})
}

export function useCreateAgent() {
	const queryClient = useQueryClient()
	type CreateAgentRequest = InferRequestType<AgentsRoute['$post']>['json']

	return useMutation({
		mutationFn: async (data: CreateAgentRequest) => {
			const res = await client.api.agents.$post({ json: data })
			if (!res.ok) throw new Error('Failed to create agent')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
		},
	})
}

export function useUpdateAgent() {
	const queryClient = useQueryClient()
	type UpdateAgentRequest = InferRequestType<AgentRoute['$patch']>['json']

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateAgentRequest }) => {
			const res = await client.api.agents[':id'].$patch({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to update agent')
			return res.json()
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) })
		},
	})
}

export function useDeleteAgent() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await client.api.agents[':id'].$delete({ param: { id } })
			if (!res.ok) throw new Error('Failed to delete agent')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
		},
	})
}

export function useDeployAgent() {
	const queryClient = useQueryClient()
	type DeployAgentRequest = InferRequestType<AgentDeployRoute['$post']>['json']

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: DeployAgentRequest }) => {
			const res = await client.api.agents[':id'].deploy.$post({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to deploy agent')
			return res.json()
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) })
		},
	})
}

// Workspace hooks
export function useWorkspaces() {
	return useQuery({
		queryKey: queryKeys.workspaces.all,
		queryFn: async () => {
			const res = await client.api.workspaces.$get()
			if (!res.ok) throw new Error('Failed to fetch workspaces')
			return res.json()
		},
	})
}

export function useWorkspace(id: string) {
	return useQuery({
		queryKey: queryKeys.workspaces.detail(id),
		queryFn: async () => {
			const res = await client.api.workspaces[':id'].$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch workspace')
			return res.json()
		},
		enabled: !!id,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	type CreateWorkspaceRequest = InferRequestType<WorkspacesRoute['$post']>['json']

	return useMutation({
		mutationFn: async (data: CreateWorkspaceRequest) => {
			const res = await client.api.workspaces.$post({ json: data })
			if (!res.ok) throw new Error('Failed to create workspace')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	type UpdateWorkspaceRequest = InferRequestType<WorkspaceRoute['$patch']>['json']

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateWorkspaceRequest }) => {
			const res = await client.api.workspaces[':id'].$patch({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to update workspace')
			return res.json()
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(id) })
		},
	})
}

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await client.api.workspaces[':id'].$delete({ param: { id } })
			if (!res.ok) throw new Error('Failed to delete workspace')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
		},
	})
}

// Tool hooks
export function useTools() {
	return useQuery({
		queryKey: queryKeys.tools.all,
		queryFn: async () => {
			const res = await client.api.tools.$get()
			if (!res.ok) throw new Error('Failed to fetch tools')
			return res.json()
		},
	})
}

export function useTool(id: string) {
	return useQuery({
		queryKey: queryKeys.tools.detail(id),
		queryFn: async () => {
			const res = await client.api.tools[':id'].$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch tool')
			return res.json()
		},
		enabled: !!id,
	})
}

export function useCreateTool() {
	const queryClient = useQueryClient()
	type CreateToolRequest = InferRequestType<ToolsRoute['$post']>['json']

	return useMutation({
		mutationFn: async (data: CreateToolRequest) => {
			const res = await client.api.tools.$post({ json: data })
			if (!res.ok) throw new Error('Failed to create tool')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.all })
		},
	})
}

export function useUpdateTool() {
	const queryClient = useQueryClient()
	type UpdateToolRequest = InferRequestType<ToolRoute['$patch']>['json']

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateToolRequest }) => {
			const res = await client.api.tools[':id'].$patch({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to update tool')
			return res.json()
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.detail(id) })
		},
	})
}

export function useDeleteTool() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await client.api.tools[':id'].$delete({ param: { id } })
			if (!res.ok) throw new Error('Failed to delete tool')
			return res.json()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.all })
		},
	})
}

// Usage hooks
export function useWorkspaceUsage(params?: {
	startDate?: string
	endDate?: string
	agentId?: string
	groupBy?: string
}) {
	return useQuery({
		queryKey: queryKeys.usage.workspace(params),
		queryFn: async () => {
			const res = await client.api.usage.$get({
				query: params,
			})
			if (!res.ok) throw new Error('Failed to fetch workspace usage')
			return res.json()
		},
	})
}

export function useAgentUsage(id: string) {
	return useQuery({
		queryKey: queryKeys.usage.agent(id),
		queryFn: async () => {
			const res = await client.api.usage.agents[':id'].$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch agent usage')
			return res.json()
		},
		enabled: !!id,
	})
}
