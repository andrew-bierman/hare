/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 * oRPC hooks are the single source of truth for type-safe API hooks.
 */

// Query keys
export * from './query-keys'

// oRPC Hooks - single source of truth for type-safe API hooks
export * from '../orpc-hooks'

// =============================================================================
// Non-oRPC Hooks
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

// Auth hooks (OAuthProviders type exported from @hare/types)
export { useOAuthProvidersQuery } from './use-auth'

// Billing hooks
export {
	type BillingStatus,
	type CheckoutRequest,
	type PaymentHistoryItem,
	type Plan,
	useBillingStatusQuery,
	useCreateCheckoutMutation,
	useCreatePortalMutation,
	usePaymentHistoryQuery,
	usePlansQuery,
} from './use-billing'

// Chat hooks
export {
	useChat,
	useConversationsQuery,
	useConversationSearchQuery,
	useMessagesQuery,
} from './use-chat'
export type {
	ChatStreamEventData,
	ChatUsage,
	Conversation,
	ConversationSearchParams,
	ConversationSearchResult,
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
