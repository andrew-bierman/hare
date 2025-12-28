/**
 * Chat Feature
 *
 * Real-time chat functionality with AI agents.
 */

// Re-export hooks explicitly to avoid name collisions
export {
	useChat,
	useConversations,
	useMessages,
	type Message,
	type Conversation,
	type ChatUsage,
	type ChatStreamEventData,
	type ToolCallData,
} from './api/hooks'

// Re-export infinite query hooks with renamed Message type
export {
	useInfiniteMessages,
	useAddMessageToCache,
	usePrefetchNextMessages,
	type ConversationPage,
	type UseInfiniteMessagesOptions,
} from './api/infinite-query'
