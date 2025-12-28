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
	useAgent,
	useAgentPreview,
	useAgentPreviewQuery,
	useAgents,
	useCreateAgent,
	useDeleteAgent,
	useDeployAgent,
	usePrefetchAgent,
	useUpdateAgent,
} from './use-agents'

// Analytics hooks
export { useAnalytics } from './use-analytics'

// API Key hooks
export {
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
	useBillingStatus,
	useCreateCheckout,
	useCreatePortal,
	usePaymentHistory,
	usePlans,
} from './use-billing'

// Chat hooks
export { useChat, useConversations, useMessages } from './use-chat'
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
	useLogStats,
	useLogs,
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
	useClearMemories,
	useCreateMemory,
	useDeleteMemory,
	useMemories,
	useSearchMemories,
	useUpdateMemory,
} from './use-memory'

// Schedule hooks
export {
	type UseAgentExecutionsInput,
	type UseScheduleExecutionsInput,
	type UseScheduleInput,
	type UseSchedulesInput,
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
	useRemoveMember,
	useRevokeInvitation,
	useSendInvitation,
	useUpdateMemberRole,
	useWorkspaceInvitations,
	useWorkspaceMembers,
} from './use-team'

// Tool hooks
export {
	TOOL_TYPES,
	useCreateTool,
	useDeleteTool,
	useTestExistingTool,
	useTestTool,
	useTool,
	useTools,
	useUpdateTool,
} from './use-tools'

// Usage hooks (UsageParams exported from client.ts to avoid duplicates)
export { useAgentUsage, useUsage, useUsageByAgent } from './use-usage'

// Workspace hooks
export {
	useCreateWorkspace,
	useDeleteWorkspace,
	useUpdateWorkspace,
	useWorkspaceById,
	useWorkspaces,
} from './use-workspaces'
