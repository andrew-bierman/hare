/**
 * Infinite Query Hooks for Conversations
 *
 * Uses TanStack Query's infinite query pattern for efficient pagination.
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { conversationKeys } from '@hare/app/shared'

interface Message {
	id: string
	conversationId: string
	role: 'user' | 'assistant' | 'system'
	content: string
	createdAt: string
}

interface ConversationPage {
	messages: Message[]
	nextCursor?: string
	hasMore: boolean
}

interface UseInfiniteMessagesOptions {
	conversationId: string
	pageSize?: number
	enabled?: boolean
}

/**
 * Fetch messages with cursor-based pagination
 */
async function fetchMessagesPage(options: {
	conversationId: string
	pageSize: number
	cursor?: string
}): Promise<ConversationPage> {
	const { conversationId, pageSize, cursor } = options

	const params = new URLSearchParams({
		limit: pageSize.toString(),
	})
	if (cursor) {
		params.set('cursor', cursor)
	}

	const response = await fetch(`/api/conversations/${conversationId}/messages?${params}`, {
		credentials: 'include',
	})

	if (!response.ok) {
		throw new Error('Failed to fetch messages')
	}

	return response.json()
}

/**
 * Hook for infinite loading of conversation messages
 *
 * Features:
 * - Cursor-based pagination (load older messages)
 * - Automatic caching and deduplication
 * - Background refetching
 * - Optimized for virtualized lists
 *
 * @example
 * ```tsx
 * function ChatWindow({ conversationId }) {
 *   const {
 *     data,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *   } = useInfiniteMessages({
 *     conversationId,
 *     pageSize: 50,
 *   })
 *
 *   // Flatten pages into single array
 *   const messages = data?.pages.flatMap(page => page.messages) ?? []
 *
 *   return (
 *     <VirtualizedMessageList
 *       messages={messages}
 *       hasNextPage={hasNextPage}
 *       isFetchingNextPage={isFetchingNextPage}
 *       onLoadMore={fetchNextPage}
 *     />
 *   )
 * }
 * ```
 */
export function useInfiniteMessages(options: UseInfiniteMessagesOptions) {
	const { conversationId, pageSize = 50, enabled = true } = options

	return useInfiniteQuery({
		queryKey: [...conversationKeys.messages(conversationId), 'infinite'],
		queryFn: ({ pageParam }) =>
			fetchMessagesPage({
				conversationId,
				pageSize,
				cursor: pageParam,
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		enabled: enabled && !!conversationId,
		staleTime: 30000, // 30 seconds
		refetchOnWindowFocus: false,
	})
}

/**
 * Hook to add a new message to the infinite query cache
 * Useful for optimistic updates when sending messages
 */
export function useAddMessageToCache() {
	const queryClient = useQueryClient()

	return (conversationId: string, message: Message) => {
		queryClient.setQueryData<{
			pages: ConversationPage[]
			pageParams: (string | undefined)[]
		}>([...conversationKeys.messages(conversationId), 'infinite'], (old) => {
			if (!old) return old

			// Add message to the last page (most recent)
			const newPages = [...old.pages]
			const lastPageIndex = newPages.length - 1
			newPages[lastPageIndex] = {
				...newPages[lastPageIndex],
				messages: [...newPages[lastPageIndex].messages, message],
			}

			return {
				...old,
				pages: newPages,
			}
		})
	}
}

/**
 * Prefetch next page of messages
 */
export function usePrefetchNextMessages() {
	const queryClient = useQueryClient()

	return async (conversationId: string, cursor: string, pageSize = 50) => {
		await queryClient.prefetchInfiniteQuery({
			queryKey: [...conversationKeys.messages(conversationId), 'infinite'],
			queryFn: ({ pageParam }) =>
				fetchMessagesPage({
					conversationId,
					pageSize,
					cursor: pageParam,
				}),
			initialPageParam: cursor,
		})
	}
}

export type { Message, ConversationPage, UseInfiniteMessagesOptions }
