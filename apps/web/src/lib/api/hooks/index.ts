/**
 * API Hooks
 *
 * Re-export all hooks from @hare/app package.
 * This file exists for backward compatibility.
 */

// Re-export everything from @hare/app's shared API hooks
export * from '@hare/app/shared/api'

// Re-export AI models from config for convenience
export { AI_MODELS, getModelById, getModelName, type AIModel } from '@hare/config'
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
	useAgentPreviewMutation,
	useAgentPreviewQuery,
	useAgentQuery,
	useAgentsQuery,
	useCreateAgentMutation,
	useDeleteAgentMutation,
	useDeployAgentMutation,
	usePrefetchAgent,
	useUpdateAgentMutation,
	type ValidationIssue,
} from './use-agents'
// Analytics hooks
export { useAnalyticsQuery } from './use-analytics'
// API Key hooks
export {
	type ApiKey,
	type ApiKeyWithSecret,
	type CreateApiKeyInput,
	type UpdateApiKeyInput,
	useApiKeyQuery,
	useApiKeysQuery,
	useCreateApiKeyMutation,
	useDeleteApiKeyMutation,
	useUpdateApiKeyMutation,
} from './use-api-keys'
// Auth hooks
export { useOAuthProvidersQuery } from './use-auth'
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
	useBillingStatusQuery,
	useCreateCheckoutMutation,
	useCreatePortalMutation,
	usePaymentHistoryQuery,
	usePlansQuery,
} from './use-billing'
// Chat hooks
export { useChat } from './use-chat'
// Logs hooks
export {
	type LogStats,
	type LogsParams,
	type LogsResponse,
	type RequestLog,
	useLogStatsQuery,
	useLogsQuery,
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
	useClearMemoriesMutation,
	useCreateMemoryMutation,
	useDeleteMemoryMutation,
	useMemoriesQuery,
	useSearchMemoriesMutation,
	useUpdateMemoryMutation,
} from './use-memory'
// Schedule hooks
export {
	type CreateScheduleInput,
	type Schedule,
	type ScheduleExecution,
	type ScheduleStatus,
	type ScheduleType,
	type UpdateScheduleInput,
	useAgentExecutionsQuery,
	useCreateScheduleMutation,
	useDeleteScheduleMutation,
	useScheduleExecutionsQuery,
	useScheduleQuery,
	useSchedulesQuery,
	useUpdateScheduleMutation,
} from './use-schedules'
// Team management hooks
export {
	type MemberRole,
	type SendInvitationInput,
	useRemoveMemberMutation,
	useRevokeInvitationMutation,
	useSendInvitationMutation,
	useUpdateMemberRoleMutation,
	useWorkspaceInvitationsQuery,
	useWorkspaceMembersQuery,
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
	useCreateToolMutation,
	useDeleteToolMutation,
	useTestExistingToolMutation,
	useTestToolMutation,
	useToolQuery,
	useToolsQuery,
	useUpdateToolMutation,
} from './use-tools'
// Usage hooks
export { useAgentUsageQuery, useUsageByAgentQuery, useUsageQuery } from './use-usage'
// Workspace hooks
export {
	useCreateWorkspaceMutation,
	useDeleteWorkspaceMutation,
	useUpdateWorkspaceMutation,
	useWorkspaceQuery,
	useWorkspacesQuery,
} from './use-workspaces'
