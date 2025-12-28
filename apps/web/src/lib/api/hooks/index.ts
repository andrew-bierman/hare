/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 */

export type { AIModel } from 'web-app/config'
// Re-export AI models from config for convenience
export { AI_MODELS, getModelById, getModelName } from 'web-app/config'
// Re-export analytics types from client (client.ts is in the package now)
export type {
	AgentBreakdown,
	AnalyticsData,
	AnalyticsParams,
	AnalyticsSummary,
	ModelBreakdown,
	OAuthProviders,
	TimeSeriesData,
} from '@hare/api/client'
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
// WebSocket Agent hooks
export {
	type AgentMessage,
	type ConnectionStatus,
	type UseAgentWebSocketOptions,
	type UseAgentWebSocketReturn,
	useAgentWebSocket,
} from './use-agent-ws'
// Agent hooks
export {
	type AgentPreviewInput,
	type AgentPreviewResponse,
	useAgent,
	useAgentPreview,
	useAgentPreviewQuery,
	useAgents,
	useCreateAgent,
	useDeleteAgent,
	useDeployAgent,
	useUpdateAgent,
	type ValidationIssue,
} from './use-agents'
// Analytics hooks
export { useAnalytics } from './use-analytics'
// API Key hooks
export {
	type ApiKey,
	type ApiKeyWithSecret,
	type CreateApiKeyInput,
	type UpdateApiKeyInput,
	useApiKey,
	useApiKeys,
	useCreateApiKey,
	useDeleteApiKey,
	useUpdateApiKey,
} from './use-api-keys'
// Auth hooks
export { useOAuthProviders } from './use-auth'
// Billing hooks
export {
	type BillingStatus,
	type CheckoutRequest,
	type CheckoutResponse,
	type PaymentHistoryItem,
	type PaymentHistoryResponse,
	type Plan,
	type PlanFeatures,
	type PlansResponse,
	type PortalResponse,
	useBillingStatus,
	useCreateCheckout,
	useCreatePortal,
	usePaymentHistory,
	usePlans,
} from './use-billing'
// Chat hooks
export { useChat } from './use-chat'
// Logs hooks
export {
	type LogStats,
	type LogsParams,
	type LogsResponse,
	type RequestLog,
	useLogStats,
	useLogs,
} from './use-logs'
// Memory hooks
export {
	type CreateMemoryInput,
	type Memory,
	type MemoryListResponse,
	type MemoryType,
	type SearchMemoryInput,
	type SearchResult,
	type UpdateMemoryInput,
	useClearMemories,
	useCreateMemory,
	useDeleteMemory,
	useMemories,
	useSearchMemories,
	useUpdateMemory,
} from './use-memory'
// Schedule hooks
export {
	type CreateScheduleInput,
	type Schedule,
	type ScheduleExecution,
	type ScheduleStatus,
	type ScheduleType,
	type UpdateScheduleInput,
	useAgentExecutions,
	useCreateSchedule,
	useDeleteSchedule,
	useSchedule,
	useScheduleExecutions,
	useSchedules,
	useUpdateSchedule,
} from './use-schedules'
// Team management hooks
export {
	type MemberRole,
	type SendInvitationInput,
	useRemoveMember,
	useRevokeInvitation,
	useSendInvitation,
	useUpdateMemberRole,
	useWorkspaceInvitations,
	useWorkspaceMembers,
	type WorkspaceInvitation,
	type WorkspaceMember,
} from './use-team'
// Tool hooks
export {
	type HttpToolConfig,
	type InputSchema,
	type InputSchemaProperty,
	TOOL_TYPES,
	type ToolTestResult,
	useCreateTool,
	useDeleteTool,
	useTestExistingTool,
	useTestTool,
	useTool,
	useTools,
	useUpdateTool,
} from './use-tools'
// Usage hooks
export { useAgentUsage, useUsage, useUsageByAgent } from './use-usage'
// Workspace hooks
export {
	useCreateWorkspace,
	useDeleteWorkspace,
	useUpdateWorkspace,
	useWorkspace,
	useWorkspaces,
} from './use-workspaces'

