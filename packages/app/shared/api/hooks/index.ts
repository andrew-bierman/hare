/**
 * API Hooks
 *
 * Re-export all hooks from a single entry point.
 * oRPC hooks are the single source of truth for type-safe API hooks.
 */

// oRPC Hooks - single source of truth for type-safe API hooks
export * from '../orpc-hooks'
// Query keys
export * from './query-keys'

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
	type BuyCreditsRequest,
	type CreditPack,
	type CreditsStatus,
	useBuyCreditsMutation,
	useCreditsStatusQuery,
} from './use-billing'
export type {
	ChatStreamEventData,
	ChatUsage,
	Conversation,
	ConversationSearchParams,
	ConversationSearchResult,
	Message,
	ToolCallData,
} from './use-chat'
// Chat hooks
export {
	useChat,
	useConversationSearchQuery,
	useConversationsQuery,
	useMessagesQuery,
} from './use-chat'
export type {
	ConversationPage,
	UseInfiniteMessagesOptions,
} from './use-infinite-conversations'
// Infinite conversations hooks
export {
	useAddMessageToCache,
	useInfiniteMessages,
	usePrefetchNextMessages,
} from './use-infinite-conversations'

// Memory hooks
export {
	type CreateMemoryInput,
	type Memory,
	type MemoryListResponse,
	type MemoryType,
	memoryQueryKeys,
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
