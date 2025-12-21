'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from 'web-app/lib/client'
import type {
	Agent,
	AgentsResponse,
	Workspace,
	WorkspacesResponse,
	Tool,
	ToolsResponse,
	UsageResponse,
	AgentUsageResponse,
	Deployment,
	SuccessResponse,
} from 'web-app/lib/api/types'

/**
 * Hono RPC client type workaround.
 *
 * OpenAPIHono with complex middleware Variables types causes Hono's RPC
 * type inference to fail. The runtime behavior is correct - only the
 * compile-time types are affected. We cast to a simple interface here
 * and rely on explicit return types in each hook for type safety.
 */
interface ApiClient {
	agents: {
		$get: (opts?: { query?: Record<string, string> }) => Promise<Response>
		$post: (opts: { json: Record<string, unknown>; query?: Record<string, string> }) => Promise<Response>
		[key: string]: unknown
	}
	workspaces: {
		$get: () => Promise<Response>
		$post: (opts: { json: Record<string, unknown> }) => Promise<Response>
		[key: string]: unknown
	}
	tools: {
		$get: (opts?: { query?: Record<string, string> }) => Promise<Response>
		$post: (opts: { json: Record<string, unknown>; query?: Record<string, string> }) => Promise<Response>
		[key: string]: unknown
	}
	usage: {
		$get: (opts?: { query?: Record<string, string | undefined> }) => Promise<Response>
		agents: { [key: string]: unknown }
		[key: string]: unknown
	}
	[key: string]: unknown
}

const api = client.api as unknown as ApiClient

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
	return useQuery<AgentsResponse>({
		queryKey: queryKeys.agents.all,
		queryFn: async (): Promise<AgentsResponse> => {
			const res = await api.agents.$get()
			if (!res.ok) throw new Error('Failed to fetch agents')
			return res.json() as Promise<AgentsResponse>
		},
	})
}

export function useAgent(id: string) {
	return useQuery<Agent>({
		queryKey: queryKeys.agents.detail(id),
		queryFn: async (): Promise<Agent> => {
			const endpoint = api.agents[':id'] as { $get: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch agent')
			return res.json() as Promise<Agent>
		},
		enabled: !!id,
	})
}

export function useCreateAgent() {
	const queryClient = useQueryClient()
	return useMutation<Agent, Error, {
		name: string
		model: string
		instructions: string
		description?: string
		config?: Record<string, unknown>
		toolIds?: string[]
	}>({
		mutationFn: async (data): Promise<Agent> => {
			const res = await api.agents.$post({ json: data })
			if (!res.ok) throw new Error('Failed to create agent')
			return res.json() as Promise<Agent>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
		},
	})
}

export function useUpdateAgent() {
	const queryClient = useQueryClient()
	return useMutation<Agent, Error, {
		id: string
		data: {
			name?: string
			model?: string
			instructions?: string
			description?: string
			config?: Record<string, unknown>
			toolIds?: string[]
		}
	}>({
		mutationFn: async ({ id, data }): Promise<Agent> => {
			const endpoint = api.agents[':id'] as { $patch: (opts: { param: { id: string }; json: Record<string, unknown> }) => Promise<Response> }
			const res = await endpoint.$patch({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to update agent')
			return res.json() as Promise<Agent>
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) })
		},
	})
}

export function useDeleteAgent() {
	const queryClient = useQueryClient()
	return useMutation<SuccessResponse, Error, string>({
		mutationFn: async (id): Promise<SuccessResponse> => {
			const endpoint = api.agents[':id'] as { $delete: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$delete({ param: { id } })
			if (!res.ok) throw new Error('Failed to delete agent')
			return res.json() as Promise<SuccessResponse>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
		},
	})
}

export function useDeployAgent() {
	const queryClient = useQueryClient()
	return useMutation<Deployment, Error, { id: string; data: { version?: string } }>({
		mutationFn: async ({ id, data }): Promise<Deployment> => {
			const agentEndpoint = api.agents[':id'] as { deploy: { $post: (opts: { param: { id: string }; json: Record<string, unknown> }) => Promise<Response> } }
			const res = await agentEndpoint.deploy.$post({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to deploy agent')
			return res.json() as Promise<Deployment>
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) })
		},
	})
}

// Workspace hooks
export function useWorkspaces() {
	return useQuery<WorkspacesResponse>({
		queryKey: queryKeys.workspaces.all,
		queryFn: async (): Promise<WorkspacesResponse> => {
			const res = await api.workspaces.$get()
			if (!res.ok) throw new Error('Failed to fetch workspaces')
			return res.json() as Promise<WorkspacesResponse>
		},
	})
}

export function useWorkspace(id: string) {
	return useQuery<Workspace>({
		queryKey: queryKeys.workspaces.detail(id),
		queryFn: async (): Promise<Workspace> => {
			const endpoint = api.workspaces[':id'] as { $get: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch workspace')
			return res.json() as Promise<Workspace>
		},
		enabled: !!id,
	})
}

export function useCreateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation<Workspace, Error, { name: string; description?: string }>({
		mutationFn: async (data): Promise<Workspace> => {
			const res = await api.workspaces.$post({ json: data })
			if (!res.ok) throw new Error('Failed to create workspace')
			return res.json() as Promise<Workspace>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
		},
	})
}

export function useUpdateWorkspace() {
	const queryClient = useQueryClient()
	return useMutation<Workspace, Error, {
		id: string
		data: { name?: string; description?: string }
	}>({
		mutationFn: async ({ id, data }): Promise<Workspace> => {
			const endpoint = api.workspaces[':id'] as { $patch: (opts: { param: { id: string }; json: Record<string, unknown> }) => Promise<Response> }
			const res = await endpoint.$patch({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to update workspace')
			return res.json() as Promise<Workspace>
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(id) })
		},
	})
}

export function useDeleteWorkspace() {
	const queryClient = useQueryClient()
	return useMutation<SuccessResponse, Error, string>({
		mutationFn: async (id): Promise<SuccessResponse> => {
			const endpoint = api.workspaces[':id'] as { $delete: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$delete({ param: { id } })
			if (!res.ok) throw new Error('Failed to delete workspace')
			return res.json() as Promise<SuccessResponse>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
		},
	})
}

// Tool hooks
export function useTools() {
	return useQuery<ToolsResponse>({
		queryKey: queryKeys.tools.all,
		queryFn: async (): Promise<ToolsResponse> => {
			const res = await api.tools.$get()
			if (!res.ok) throw new Error('Failed to fetch tools')
			return res.json() as Promise<ToolsResponse>
		},
	})
}

export function useTool(id: string) {
	return useQuery<Tool>({
		queryKey: queryKeys.tools.detail(id),
		queryFn: async (): Promise<Tool> => {
			const endpoint = api.tools[':id'] as { $get: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch tool')
			return res.json() as Promise<Tool>
		},
		enabled: !!id,
	})
}

export function useCreateTool() {
	const queryClient = useQueryClient()
	return useMutation<Tool, Error, {
		name: string
		description: string
		type: 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'
		inputSchema: Record<string, unknown>
		config?: Record<string, unknown>
		code?: string
	}>({
		mutationFn: async (data): Promise<Tool> => {
			const res = await api.tools.$post({ json: data })
			if (!res.ok) throw new Error('Failed to create tool')
			return res.json() as Promise<Tool>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.all })
		},
	})
}

export function useUpdateTool() {
	const queryClient = useQueryClient()
	return useMutation<Tool, Error, {
		id: string
		data: {
			name?: string
			description?: string
			type?: 'http' | 'sql' | 'kv' | 'r2' | 'vectorize' | 'custom'
			inputSchema?: Record<string, unknown>
			config?: Record<string, unknown>
			code?: string
		}
	}>({
		mutationFn: async ({ id, data }): Promise<Tool> => {
			const endpoint = api.tools[':id'] as { $patch: (opts: { param: { id: string }; json: Record<string, unknown> }) => Promise<Response> }
			const res = await endpoint.$patch({ param: { id }, json: data })
			if (!res.ok) throw new Error('Failed to update tool')
			return res.json() as Promise<Tool>
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.tools.detail(id) })
		},
	})
}

export function useDeleteTool() {
	const queryClient = useQueryClient()
	return useMutation<SuccessResponse, Error, string>({
		mutationFn: async (id): Promise<SuccessResponse> => {
			const endpoint = api.tools[':id'] as { $delete: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$delete({ param: { id } })
			if (!res.ok) throw new Error('Failed to delete tool')
			return res.json() as Promise<SuccessResponse>
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
	return useQuery<UsageResponse>({
		queryKey: queryKeys.usage.workspace(params),
		queryFn: async (): Promise<UsageResponse> => {
			const res = await api.usage.$get({
				query: params as Record<string, string | undefined>,
			})
			if (!res.ok) throw new Error('Failed to fetch workspace usage')
			return res.json() as Promise<UsageResponse>
		},
	})
}

export function useAgentUsage(id: string) {
	return useQuery<AgentUsageResponse>({
		queryKey: queryKeys.usage.agent(id),
		queryFn: async (): Promise<AgentUsageResponse> => {
			const endpoint = api.usage.agents[':id'] as { $get: (opts: { param: { id: string } }) => Promise<Response> }
			const res = await endpoint.$get({ param: { id } })
			if (!res.ok) throw new Error('Failed to fetch agent usage')
			return res.json() as Promise<AgentUsageResponse>
		},
		enabled: !!id,
	})
}
