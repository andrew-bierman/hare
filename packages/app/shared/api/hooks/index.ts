/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 * Note: Most CRUD hooks have been migrated to oRPC - see orpc-hooks.ts
 */

// Query keys
export * from './query-keys'

// =============================================================================
// oRPC Hooks (Type-safe, recommended for new code)
// =============================================================================

export {
	// Agent hooks
	useAgentsQuery,
	useAgentQuery,
	useCreateAgentMutation,
	useUpdateAgentMutation,
	useDeleteAgentMutation,
	useDeployAgentMutation,
	useUndeployAgentMutation,
	// Tool hooks
	useToolsQuery,
	useToolQuery,
	useCreateToolMutation,
	useUpdateToolMutation,
	useDeleteToolMutation,
	useTestToolMutation,
	useTestExistingToolMutation,
	// API Key hooks
	useApiKeysQuery,
	useApiKeyQuery,
	useCreateApiKeyMutation,
	useUpdateApiKeyMutation,
	useDeleteApiKeyMutation,
	// Workspace hooks
	useWorkspacesQuery,
	useCurrentWorkspaceQuery,
	useWorkspaceQuery,
	useCreateWorkspaceMutation,
	useUpdateWorkspaceMutation,
	useDeleteWorkspaceMutation,
	useEnsureDefaultWorkspaceMutation,
	// Schedule hooks
	useSchedulesQuery,
	useScheduleQuery,
	useCreateScheduleMutation,
	useUpdateScheduleMutation,
	useDeleteScheduleMutation,
	usePauseScheduleMutation,
	useResumeScheduleMutation,
	useScheduleExecutionsQuery,
	useAgentExecutionsQuery,
	// Workspace Members hooks
	useWorkspaceMembersQuery,
	useWorkspaceInvitationsQuery,
	useSendInvitationMutation,
	useRevokeInvitationMutation,
	useRemoveMemberMutation,
	useUpdateMemberRoleMutation,
	// User Settings hooks
	useUserPreferencesQuery,
	useUpdateUserPreferencesMutation,
	// Usage hooks
	useWorkspaceUsageQuery,
	useAgentUsageQuery,
	// Analytics hooks
	useAnalyticsQuery,
	// Logs hooks
	useLogsQuery,
	useLogStatsQuery,
} from '../orpc-hooks'

// =============================================================================
// Legacy Hono Hooks (not yet migrated to oRPC)
// =============================================================================

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

// Auth hooks
export { type OAuthProviders, useOAuthProvidersQuery } from './use-auth'

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
