/**
 * API Hooks
 *
 * Re-export all hooks from @hare/app package.
 * This file exists for backward compatibility.
 */

// Re-export types from @hare/api
export type {
	Agent,
	AgentConfig,
	AgentStatus,
	AgentUsage,
	ApiError,
	ChatMessage,
	ChatRequest,
	ChatStreamEvent,
	CreateAgentInput,
	CreateToolInput,
	CreateWorkspaceInput,
	Tool,
	ToolType,
	UpdateAgentInput,
	UsageSummary,
	Workspace,
	WorkspaceRole,
} from '@hare/api'

// Re-export types from @hare/api/client
export type {
	// Analytics types
	AgentBreakdown,
	// Agent preview types
	AgentPreviewInput,
	AgentPreviewResponse,
	AnalyticsData,
	AnalyticsParams,
	AnalyticsSummary,
	// API Key types
	ApiKey,
	ApiKeyWithSecret,
	// Billing types
	BillingPlan,
	BillingPlansResponse,
	BillingStatus,
	CheckoutRequest,
	CheckoutResponse,
	CreateApiKeyInput,
	ExecutionHistoryParams,
	// Tool types
	HttpToolConfig,
	InputSchema,
	InputSchemaProperty,
	ModelBreakdown,
	OAuthProviders,
	PaymentHistoryItem,
	PaymentHistoryResponse,
	PortalResponse,
	// Schedule types
	ScheduleListParams,
	TimeSeriesData,
	ToolTestRequest,
	ToolTestResult,
	UpdateApiKeyInput,
	ValidationIssue,
} from '@hare/api/client'

// Re-export everything from @hare/app entities and features
export * from '@hare/app/entities'
export * from '@hare/app/features'

// Re-export AI models from config for convenience
export type { AIModel } from '@hare/app/shared'
export { AI_MODELS, getModelById, getModelName } from '@hare/app/shared'
