/**
 * Virtualized Message List Component
 *
 * Efficiently renders large conversation message lists using TanStack Virtual.
 */

import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@hare/ui/lib/utils'
import { Bot, Loader2, User } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

export interface VirtualizedMessage {
	id: string
	role: 'user' | 'assistant' | 'system'
	content: string
	createdAt: string
}

export interface VirtualizedMessageListProps {
	/** Messages to display */
	messages: VirtualizedMessage[]
	/** Whether new messages are being loaded */
	isLoading?: boolean
	/** Whether the assistant is currently generating a response */
	isStreaming?: boolean
	/** Current streaming content (partial message) */
	streamingContent?: string
	/** Height of the container */
	height?: number | string
	/** Callback when user scrolls to top (for loading older messages) */
	onLoadMore?: () => void
	/** Whether there are more messages to load */
	hasMore?: boolean
	/** Whether currently loading more messages */
	isLoadingMore?: boolean
	/** Estimated message height for virtualization */
	estimatedMessageHeight?: number
}

/**
 * Virtualized message list for chat interfaces
 *
 * Features:
 * - Efficient rendering of large message histories
 * - Auto-scroll to bottom on new messages
 * - Sticky scroll behavior (stays at bottom unless user scrolls up)
 * - Load more on scroll to top
 * - Streaming message support
 *
 * @example
 * ```tsx
 * function ChatWindow() {
 *   const { messages, isLoading } = useMessages(conversationId)
 *
 *   return (
 *     <VirtualizedMessageList
 *       messages={messages}
 *       isLoading={isLoading}
 *       height={600}
 *     />
 *   )
 * }
 * ```
 */
export function VirtualizedMessageList({
	messages,
	isLoading = false,
	isStreaming = false,
	streamingContent,
	height = 500,
	onLoadMore,
	hasMore = false,
	isLoadingMore = false,
	estimatedMessageHeight = 100,
}: VirtualizedMessageListProps) {
	const parentRef = useRef<HTMLDivElement>(null)
	const isAtBottomRef = useRef(true)

	// Create streaming message if content exists
	const allMessages = streamingContent
		? [
				...messages,
				{
					id: 'streaming',
					role: 'assistant' as const,
					content: streamingContent,
					createdAt: new Date().toISOString(),
				},
			]
		: messages

	const virtualizer = useVirtualizer({
		count: allMessages.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => estimatedMessageHeight,
		overscan: 5,
		getItemKey: (index) => allMessages[index]?.id ?? `msg-${index}`,
	})

	const virtualItems = virtualizer.getVirtualItems()

	// Check if scrolled to bottom
	const checkIfAtBottom = useCallback(() => {
		const el = parentRef.current
		if (!el) return true
		const threshold = 100
		return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
	}, [])

	// Handle scroll events
	const handleScroll = useCallback(() => {
		isAtBottomRef.current = checkIfAtBottom()

		// Load more when scrolled to top
		const el = parentRef.current
		if (el && el.scrollTop < 100 && hasMore && !isLoadingMore && onLoadMore) {
			onLoadMore()
		}
	}, [checkIfAtBottom, hasMore, isLoadingMore, onLoadMore])

	// Auto-scroll to bottom when new messages arrive (if already at bottom)
	useEffect(() => {
		if (isAtBottomRef.current && allMessages.length > 0) {
			virtualizer.scrollToIndex(allMessages.length - 1, { align: 'end', behavior: 'smooth' })
		}
	}, [allMessages.length, virtualizer])

	// Scroll to bottom on initial load
	useEffect(() => {
		if (allMessages.length > 0) {
			virtualizer.scrollToIndex(allMessages.length - 1, { align: 'end' })
		}
	}, [allMessages.length, virtualizer.scrollToIndex])

	return (
		<div ref={parentRef} className="overflow-auto" style={{ height }} onScroll={handleScroll}>
			{/* Loading more indicator */}
			{isLoadingMore && (
				<div className="flex items-center justify-center py-4">
					<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					<span className="ml-2 text-sm text-muted-foreground">Loading older messages...</span>
				</div>
			)}

			{/* Empty state */}
			{allMessages.length === 0 && !isLoading && (
				<div className="flex h-full items-center justify-center">
					<p className="text-muted-foreground">No messages yet. Start a conversation!</p>
				</div>
			)}

			{/* Initial loading state */}
			{isLoading && allMessages.length === 0 && (
				<div className="flex h-full items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* Virtualized message list */}
			{allMessages.length > 0 && (
				<div
					style={{
						height: virtualizer.getTotalSize(),
						width: '100%',
						position: 'relative',
					}}
				>
					{virtualItems.map((virtualItem) => {
						const message = allMessages[virtualItem.index]
						if (!message) return null
						const isStreamingMessage = message.id === 'streaming'

						return (
							<div
								key={virtualItem.key}
								data-index={virtualItem.index}
								ref={virtualizer.measureElement}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									transform: `translateY(${virtualItem.start}px)`,
								}}
							>
								<MessageBubble message={message} isStreaming={isStreamingMessage} />
							</div>
						)
					})}
				</div>
			)}

			{/* Typing indicator */}
			{isStreaming && !streamingContent && (
				<div className="flex items-center gap-2 px-4 py-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<Bot className="h-4 w-4 text-primary" />
					</div>
					<div className="flex gap-1">
						<span
							className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
							style={{ animationDelay: '0ms' }}
						/>
						<span
							className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
							style={{ animationDelay: '150ms' }}
						/>
						<span
							className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
							style={{ animationDelay: '300ms' }}
						/>
					</div>
				</div>
			)}
		</div>
	)
}

/**
 * Individual message bubble component
 */
export interface MessageBubbleProps {
	message: VirtualizedMessage
	isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
	const isUser = message.role === 'user'
	const isSystem = message.role === 'system'

	if (isSystem) {
		return (
			<div className="flex justify-center px-4 py-2">
				<div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
					{message.content}
				</div>
			</div>
		)
	}

	return (
		<div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
			{/* Avatar */}
			<div
				className={cn(
					'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
				)}
			>
				{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
			</div>

			{/* Message content */}
			<div
				className={cn(
					'max-w-[80%] rounded-2xl px-4 py-2',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
					isStreaming && 'animate-pulse',
				)}
			>
				<p className="whitespace-pre-wrap text-sm">{message.content}</p>
				{!isStreaming && (
					<time className="mt-1 block text-xs opacity-60">
						{new Date(message.createdAt).toLocaleTimeString()}
					</time>
				)}
			</div>
		</div>
	)
}
