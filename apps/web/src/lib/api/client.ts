/**
 * Type-safe API Client
 *
 * Simple fetch wrapper with proper error handling.
 */

import type {
	Agent,
	AgentUsage,
	ApiError,
	CreateAgentInput,
	CreateToolInput,
	CreateWorkspaceInput,
	Tool,
	UpdateAgentInput,
	UsageSummary,
	Workspace,
} from './types'

// =============================================================================
// Error Handling
// =============================================================================

export class ApiClientError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string,
	) {
		super(message)
		this.name = 'ApiClientError'
	}
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		let errorMessage = `Request failed with status ${response.status}`
		let errorCode: string | undefined

		try {
			const error = (await response.json()) as ApiError
			errorMessage = error.error
			errorCode = error.code
		} catch {
			// Response wasn't JSON, use default message
		}

		throw new ApiClientError(errorMessage, response.status, errorCode)
	}

	return response.json() as Promise<T>
}

// =============================================================================
// Base Request Functions
// =============================================================================

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
	const url = new URL(path, window.location.origin)
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				url.searchParams.set(key, value)
			}
		}
	}
	return url.toString()
}

async function get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
	const response = await fetch(buildUrl(path, params), {
		method: 'GET',
		credentials: 'include',
	})
	return handleResponse<T>(response)
}

async function post<T, B>(
	path: string,
	body: B,
	params?: Record<string, string | undefined>,
): Promise<T> {
	const response = await fetch(buildUrl(path, params), {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	return handleResponse<T>(response)
}

async function patch<T, B>(
	path: string,
	body: B,
	params?: Record<string, string | undefined>,
): Promise<T> {
	const response = await fetch(buildUrl(path, params), {
		method: 'PATCH',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	return handleResponse<T>(response)
}

async function del<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
	const response = await fetch(buildUrl(path, params), {
		method: 'DELETE',
		credentials: 'include',
	})
	return handleResponse<T>(response)
}

// =============================================================================
// Auth API
// =============================================================================

export interface OAuthProviders {
	google: boolean
	github: boolean
}

export const auth = {
	getProviders: () => get<{ providers: OAuthProviders }>('/api/auth/providers'),
}

// =============================================================================
// Agents API
// =============================================================================

export const agents = {
	list: (workspaceId: string) => get<{ agents: Agent[] }>('/api/agents', { workspaceId }),

	get: (id: string, workspaceId: string) => get<Agent>(`/api/agents/${id}`, { workspaceId }),

	create: (workspaceId: string, data: CreateAgentInput) =>
		post<Agent, CreateAgentInput>('/api/agents', data, { workspaceId }),

	update: (id: string, workspaceId: string, data: UpdateAgentInput) =>
		patch<Agent, UpdateAgentInput>(`/api/agents/${id}`, data, { workspaceId }),

	delete: (id: string, workspaceId: string) =>
		del<{ success: true }>(`/api/agents/${id}`, { workspaceId }),

	deploy: (id: string, workspaceId: string, version?: string) =>
		post<
			{ id: string; status: 'deployed'; deployedAt: string; version: string },
			{ version?: string }
		>(`/api/agents/${id}/deploy`, { version }, { workspaceId }),
}

// =============================================================================
// Tools API
// =============================================================================

export const tools = {
	list: (workspaceId: string) => get<{ tools: Tool[] }>('/api/tools', { workspaceId }),

	get: (id: string, workspaceId: string) => get<Tool>(`/api/tools/${id}`, { workspaceId }),

	create: (workspaceId: string, data: CreateToolInput) =>
		post<Tool, CreateToolInput>('/api/tools', data, { workspaceId }),

	update: (id: string, workspaceId: string, data: Partial<CreateToolInput>) =>
		patch<Tool, Partial<CreateToolInput>>(`/api/tools/${id}`, data, { workspaceId }),

	delete: (id: string, workspaceId: string) =>
		del<{ success: true }>(`/api/tools/${id}`, { workspaceId }),
}

// =============================================================================
// Workspaces API
// =============================================================================

export const workspaces = {
	list: () => get<{ workspaces: Workspace[] }>('/api/workspaces'),

	get: (id: string) => get<Workspace>(`/api/workspaces/${id}`),

	create: (data: CreateWorkspaceInput) =>
		post<Workspace, CreateWorkspaceInput>('/api/workspaces', data),

	update: (id: string, data: Partial<CreateWorkspaceInput>) =>
		patch<Workspace, Partial<CreateWorkspaceInput>>(`/api/workspaces/${id}`, data),

	delete: (id: string) => del<{ success: true }>(`/api/workspaces/${id}`),
}

// =============================================================================
// Usage API
// =============================================================================

export interface UsageParams {
	startDate?: string
	endDate?: string
	agentId?: string
}

export const usage = {
	getSummary: (workspaceId: string, params?: UsageParams) =>
		get<UsageSummary>('/api/usage', { workspaceId, ...params }),

	getByAgent: (workspaceId: string) =>
		get<{ usage: AgentUsage[] }>('/api/usage/by-agent', { workspaceId }),
}

// =============================================================================
// Analytics API
// =============================================================================

export interface AnalyticsParams {
	startDate?: string
	endDate?: string
	agentId?: string
	groupBy?: 'day' | 'week' | 'month'
}

export interface TimeSeriesData {
	date: string
	inputTokens: number
	outputTokens: number
	totalTokens: number
	requests: number
	cost: number
	avgLatency: number
}

export interface AgentBreakdown {
	agentId: string
	agentName: string
	requests: number
	inputTokens: number
	outputTokens: number
	totalTokens: number
	cost: number
}

export interface ModelBreakdown {
	model: string
	modelName: string
	requests: number
	inputTokens: number
	outputTokens: number
	totalTokens: number
	cost: number
}

export interface AnalyticsSummary {
	totalRequests: number
	totalInputTokens: number
	totalOutputTokens: number
	totalTokens: number
	totalCost: number
	avgLatencyMs: number
}

export interface AnalyticsData {
	summary: AnalyticsSummary
	timeSeries: TimeSeriesData[]
	byAgent: AgentBreakdown[]
	byModel: ModelBreakdown[]
	period: {
		startDate: string
		endDate: string
	}
}

export const analytics = {
	get: (workspaceId: string, params?: AnalyticsParams) =>
		get<AnalyticsData>('/api/analytics', { workspaceId, ...params }),
}

// =============================================================================
// Export unified client
// =============================================================================

export const apiClient = {
	agents,
	analytics,
	auth,
	tools,
	workspaces,
	usage,
}
