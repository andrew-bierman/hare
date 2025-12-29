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
	CreateScheduleInput,
	CreateToolInput,
	CreateWorkspaceInput,
	MemberRole,
	Schedule,
	ScheduleExecution,
	SendInvitationInput,
	Tool,
	UpdateAgentInput,
	UpdateMemberRoleInput,
	UpdateScheduleInput,
	UsageSummary,
	Workspace,
	WorkspaceInvitation,
	WorkspaceMember,
} from '@hare/api'

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

// Get base URL from environment or window.location.origin
function getBaseURL(): string {
	// Check for Vite environment variable (used by Tauri and other Vite apps)
	if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
		return import.meta.env.VITE_API_URL as string
	}
	// Fall back to window.location.origin
	if (typeof window !== 'undefined') {
		return window.location.origin
	}
	return ''
}

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
	const url = new URL(path, getBaseURL())
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
// Agent Preview/Validation Types
// =============================================================================

export interface AgentPreviewInput {
	name?: string
	description?: string
	model?: string
	instructions?: string
	config?: {
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
		stopSequences?: string[]
	}
	toolIds?: string[]
}

export interface ValidationIssue {
	field: string
	type: 'error' | 'warning'
	message: string
}

export interface ModelPreview {
	id: string
	name: string
	provider: string
	contextWindow: number
	maxOutputTokens: number
	supportsTools: boolean
	estimatedCostPer1KTokens: number
}

export interface ConfigPreview {
	temperature: number
	maxTokens: number
	topP?: number
	topK?: number
}

export interface AgentPreview {
	name: string
	description: string | null
	model: ModelPreview
	config: ConfigPreview
	toolCount: number
	toolsValid: boolean
	instructionsLength: number
	estimatedTokens: number
	readyForDeployment: boolean
}

export interface AgentPreviewResponse {
	valid: boolean
	errors: ValidationIssue[]
	warnings: ValidationIssue[]
	preview?: AgentPreview
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

	/**
	 * Preview/validate agent configuration
	 * Validates the current agent config with optional overrides
	 */
	preview: (id: string, workspaceId: string, overrides?: AgentPreviewInput) =>
		post<AgentPreviewResponse, AgentPreviewInput>(`/api/agents/${id}/preview`, overrides ?? {}, {
			workspaceId,
		}),
}

// =============================================================================
// Tools API
// =============================================================================

export interface HttpToolConfig {
	url: string
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	headers?: Record<string, string>
	body?: string
	bodyType?: 'json' | 'form' | 'text'
	responseMapping?: {
		path?: string
		transform?: string
	}
	timeout?: number
}

export interface InputSchemaProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object'
	description?: string
	default?: unknown
	enum?: string[]
	required?: boolean
}

export interface InputSchema {
	type: 'object'
	properties?: Record<string, InputSchemaProperty>
	required?: string[]
}

export interface ToolTestRequest {
	config: HttpToolConfig
	inputSchema?: InputSchema
	testInput?: Record<string, unknown>
}

export interface ToolTestResult {
	success: boolean
	status?: number
	statusText?: string
	headers?: Record<string, string>
	data?: unknown
	error?: string
	duration: number
	requestDetails: {
		url: string
		method: string
		headers?: Record<string, string>
		body?: string
	}
}

export const tools = {
	list: (workspaceId: string) => get<{ tools: Tool[] }>('/api/tools', { workspaceId }),

	get: (id: string, workspaceId: string) => get<Tool>(`/api/tools/${id}`, { workspaceId }),

	create: (workspaceId: string, data: CreateToolInput) =>
		post<Tool, CreateToolInput>('/api/tools', data, { workspaceId }),

	update: (id: string, workspaceId: string, data: Partial<CreateToolInput>) =>
		patch<Tool, Partial<CreateToolInput>>(`/api/tools/${id}`, data, { workspaceId }),

	delete: (id: string, workspaceId: string) =>
		del<{ success: true }>(`/api/tools/${id}`, { workspaceId }),

	test: (workspaceId: string, data: ToolTestRequest) =>
		post<ToolTestResult, ToolTestRequest>('/api/tools/test', data, { workspaceId }),

	testExisting: (id: string, workspaceId: string, testInput?: Record<string, unknown>) =>
		post<ToolTestResult, { testInput?: Record<string, unknown> }>(
			`/api/tools/${id}/test`,
			{ testInput },
			{ workspaceId },
		),
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

	// Team management
	members: {
		list: (workspaceId: string) =>
			get<{ members: WorkspaceMember[] }>(`/api/workspaces/${workspaceId}/members`),

		remove: (workspaceId: string, userId: string) =>
			del<{ success: true }>(`/api/workspaces/${workspaceId}/members/${userId}`),

		updateRole: (workspaceId: string, userId: string, role: MemberRole) =>
			patch<WorkspaceMember, UpdateMemberRoleInput>(
				`/api/workspaces/${workspaceId}/members/${userId}`,
				{ role },
			),
	},

	invitations: {
		list: (workspaceId: string) =>
			get<{ invitations: WorkspaceInvitation[] }>(`/api/workspaces/${workspaceId}/invites`),

		send: (workspaceId: string, data: SendInvitationInput) =>
			post<WorkspaceInvitation, SendInvitationInput>(
				`/api/workspaces/${workspaceId}/invites`,
				data,
			),

		revoke: (workspaceId: string, inviteId: string) =>
			del<{ success: true }>(`/api/workspaces/${workspaceId}/invites/${inviteId}`),
	},
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
// API Keys API
// =============================================================================

export interface ApiKey {
	id: string
	workspaceId: string
	name: string
	prefix: string
	permissions: {
		scopes?: string[]
		agentIds?: string[]
	} | null
	lastUsedAt: string | null
	expiresAt: string | null
	createdAt: string
}

export interface ApiKeyWithSecret extends Omit<ApiKey, 'lastUsedAt'> {
	key: string
}

export interface CreateApiKeyInput {
	name: string
	permissions?: {
		scopes?: string[]
		agentIds?: string[]
	}
	expiresAt?: string
}

export interface UpdateApiKeyInput {
	name?: string
	permissions?: {
		scopes?: string[]
		agentIds?: string[]
	} | null
}

export const apiKeys = {
	list: (workspaceId: string) => get<{ apiKeys: ApiKey[] }>('/api/api-keys', { workspaceId }),

	get: (id: string, workspaceId: string) => get<ApiKey>(`/api/api-keys/${id}`, { workspaceId }),

	create: (workspaceId: string, data: CreateApiKeyInput) =>
		post<ApiKeyWithSecret, CreateApiKeyInput>('/api/api-keys', data, { workspaceId }),

	update: (id: string, workspaceId: string, data: UpdateApiKeyInput) =>
		patch<ApiKey, UpdateApiKeyInput>(`/api/api-keys/${id}`, data, { workspaceId }),

	delete: (id: string, workspaceId: string) =>
		del<{ success: true }>(`/api/api-keys/${id}`, { workspaceId }),
}

// =============================================================================
// Schedules API
// =============================================================================

export interface ScheduleListParams {
	status?: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled'
}

export interface ExecutionHistoryParams {
	limit?: number
	offset?: number
}

export const schedules = {
	list: (agentId: string, workspaceId: string, params?: ScheduleListParams) =>
		get<{ schedules: Schedule[] }>(`/api/agents/${agentId}/schedules`, {
			workspaceId,
			status: params?.status,
		}),

	get: (agentId: string, scheduleId: string, workspaceId: string) =>
		get<Schedule>(`/api/agents/${agentId}/schedules/${scheduleId}`, { workspaceId }),

	create: (agentId: string, workspaceId: string, data: CreateScheduleInput) =>
		post<Schedule, CreateScheduleInput>(`/api/agents/${agentId}/schedules`, data, { workspaceId }),

	update: (agentId: string, scheduleId: string, workspaceId: string, data: UpdateScheduleInput) =>
		patch<Schedule, UpdateScheduleInput>(`/api/agents/${agentId}/schedules/${scheduleId}`, data, {
			workspaceId,
		}),

	delete: (agentId: string, scheduleId: string, workspaceId: string) =>
		del<{ success: true }>(`/api/agents/${agentId}/schedules/${scheduleId}`, { workspaceId }),

	getExecutions: (
		agentId: string,
		scheduleId: string,
		workspaceId: string,
		params?: ExecutionHistoryParams,
	) =>
		get<{ executions: ScheduleExecution[]; total: number }>(
			`/api/agents/${agentId}/schedules/${scheduleId}/executions`,
			{
				workspaceId,
				limit: params?.limit?.toString(),
				offset: params?.offset?.toString(),
			},
		),

	getAgentExecutions: (agentId: string, workspaceId: string, params?: ExecutionHistoryParams) =>
		get<{ executions: ScheduleExecution[]; total: number }>(`/api/agents/${agentId}/executions`, {
			workspaceId,
			limit: params?.limit?.toString(),
			offset: params?.offset?.toString(),
		}),
}

// =============================================================================
// Billing API
// =============================================================================

export interface BillingPlanFeatures {
	maxAgents: number
	maxMessagesPerMonth: number
}

export interface BillingPlan {
	id: string
	name: string
	description: string
	price: number | null
	priceId: string | null
	features: BillingPlanFeatures
}

export interface BillingPlansResponse {
	plans: BillingPlan[]
	currentPlanId: string | null
}

export interface BillingStatus {
	planId: string
	planName: string
	status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'
	currentPeriodEnd: string | null
	cancelAtPeriodEnd: boolean
	usage: {
		agentsUsed: number
		agentsLimit: number
		messagesUsed: number
		messagesLimit: number
	}
}

export interface CheckoutRequest {
	planId: 'pro' | 'team'
	successUrl?: string
	cancelUrl?: string
}

export interface CheckoutResponse {
	url: string
	sessionId: string
}

export interface PortalResponse {
	url: string
}

export interface PaymentHistoryItem {
	id: string
	amount: number
	currency: string
	status: string
	description: string | null
	createdAt: string
	invoiceUrl: string | null
}

export interface PaymentHistoryResponse {
	payments: PaymentHistoryItem[]
	hasMore: boolean
}

export interface PaymentHistoryParams {
	limit?: number
	starting_after?: string
}

export const billing = {
	getPlans: (workspaceId: string) =>
		get<BillingPlansResponse>('/api/billing/plans', { workspaceId }),

	getStatus: (workspaceId: string) => get<BillingStatus>('/api/billing/status', { workspaceId }),

	createCheckout: (workspaceId: string, data: CheckoutRequest) =>
		post<CheckoutResponse, CheckoutRequest>('/api/billing/checkout', data, { workspaceId }),

	createPortal: (workspaceId: string) =>
		post<PortalResponse, Record<string, never>>('/api/billing/portal', {}, { workspaceId }),

	getHistory: (workspaceId: string, params?: PaymentHistoryParams) =>
		get<PaymentHistoryResponse>('/api/billing/history', {
			workspaceId,
			limit: params?.limit?.toString(),
			starting_after: params?.starting_after,
		}),
}

// =============================================================================
// Export unified client
// =============================================================================

export const apiClient = {
	agents,
	analytics,
	apiKeys,
	auth,
	billing,
	schedules,
	tools,
	workspaces,
	usage,
}
