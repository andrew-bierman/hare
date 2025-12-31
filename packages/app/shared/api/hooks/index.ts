/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 * Types from the parent api module are already exported, so we only export hook-specific types.
 */

// Query keys
export * from './query-keys'

// WebSocket Agent types from @hare/types
export type { ClientMessage, HareAgentState, ServerMessage } from '@hare/types'

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
	useAgentQuery,
	useAgentPreviewMutation,
	useAgentPreviewQuery,
	useAgentsQuery,
	useCreateAgentMutation,
	useDeleteAgentMutation,
	useDeployAgentMutation,
	usePrefetchAgent,
	useUpdateAgentMutation,
} from './use-agents'

// Analytics hooks
export { useAnalyticsQuery } from './use-analytics'

// API Key hooks
export {
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
	useBillingStatusQuery,
	useCreateCheckoutMutation,
	useCreatePortalMutation,
	usePaymentHistoryQuery,
	usePlansQuery,
} from './use-billing'

// Chat hooks
export { useChat, useConversationsQuery, useMessagesQuery } from './use-chat'
export type {
	ChatStreamEventData,
	ChatUsage,
	Conversation,
	Message,
	ToolCallData,
} from './use-chat'

// Infinite conversations hooks
export {
	useAddMessageToCache,
	useInfiniteMessages,
	usePrefetchNextMessages,
} from './use-infinite-conversations'
export type {
	ConversationPage,
	UseInfiniteMessagesOptions,
} from './use-infinite-conversations'

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
	memoryQueryKeys,
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
	type UseAgentExecutionsInput,
	type UseScheduleExecutionsInput,
	type UseScheduleInput,
	type UseSchedulesInput,
	useAgentExecutionsQuery,
	useCreateScheduleMutation,
	useDeleteScheduleMutation,
	useScheduleQuery,
	useScheduleExecutionsQuery,
	useSchedulesQuery,
	useUpdateScheduleMutation,
} from './use-schedules'

// Team management hooks
export {
	useRemoveMemberMutation,
	useRevokeInvitationMutation,
	useSendInvitationMutation,
	useUpdateMemberRoleMutation,
	useWorkspaceInvitationsQuery,
	useWorkspaceMembersQuery,
} from './use-team'

// Tool hooks
export {
	TOOL_TYPES,
	useCreateToolMutation,
	useDeleteToolMutation,
	useTestExistingToolMutation,
	useTestToolMutation,
	useToolQuery,
	useToolsQuery,
	useUpdateToolMutation,
} from './use-tools'

// Usage hooks (UsageParams exported from client.ts to avoid duplicates)
export { useAgentUsageQuery, useUsageQuery, useUsageByAgentQuery } from './use-usage'

// Workspace hooks
export {
	useCreateWorkspaceMutation,
	useDeleteWorkspaceMutation,
	useEnsureDefaultWorkspaceMutation,
	useUpdateWorkspaceMutation,
	useWorkspaceByIdQuery,
	useWorkspacesQuery,
} from './use-workspaces'

// User preferences hooks
export {
	userPreferencesKeys,
	useUserPreferencesQuery,
	useUpdateUserPreferencesMutation,
} from './use-user-preferences'
