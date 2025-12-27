import { createFileRoute } from '@tanstack/react-router'
import { Bot, Loader2, Send, User, X } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/embed/$agentId')({
	component: EmbedChatPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			theme: (search.theme as string) || 'light',
			primaryColor: (search.primaryColor as string) || '#6366f1',
			initialMessage: (search.initialMessage as string) || '',
		}
	},
})

// Types
interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
	createdAt: string
}

interface ChatStreamEvent {
	type: 'text' | 'done' | 'error'
	content?: string
	sessionId?: string
	message?: string
}

/**
 * Embedded chat widget page
 * Stripped-down chat interface for iframe embedding
 */
function EmbedChatPage() {
	const { agentId } = Route.useParams()
	const { theme, primaryColor, initialMessage } = Route.useSearch()

	// State
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [agentName, setAgentName] = useState<string>('AI Assistant')
	const [isLoading, setIsLoading] = useState(true)

	const scrollRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const isDark = theme === 'dark'

	// Fetch agent info
	useEffect(() => {
		async function fetchAgent() {
			try {
				const response = await fetch(`/api/embed/agents/${agentId}`)
				if (response.ok) {
					const data = (await response.json()) as { name?: string }
					setAgentName(data.name || 'AI Assistant')
				}
			} catch {
				// Ignore errors, use default name
			} finally {
				setIsLoading(false)
			}
		}
		fetchAgent()
	}, [agentId])

	// Send initial message if provided
	useEffect(() => {
		if (initialMessage && !isLoading && messages.length === 0) {
			// Add as a welcome message from the assistant
			setMessages([
				{
					id: 'welcome',
					role: 'assistant',
					content: initialMessage,
					createdAt: new Date().toISOString(),
				},
			])
		}
	}, [initialMessage, isLoading, messages.length])

	// Auto-scroll helper
	const scrollToBottom = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [])

	// Notify parent that widget is ready
	useEffect(() => {
		window.parent.postMessage({ type: 'hare:widget:ready' }, '*')
	}, [])

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isStreaming) return

			setIsStreaming(true)
			setError(null)

			// Add user message
			const userMessage: Message = {
				id: `user-${Date.now()}`,
				role: 'user',
				content: content.trim(),
				createdAt: new Date().toISOString(),
			}
			setMessages((prev) => [...prev, userMessage])
			scrollToBottom()

			// Add placeholder for assistant
			const assistantMessage: Message = {
				id: `assistant-${Date.now()}`,
				role: 'assistant',
				content: '',
				createdAt: new Date().toISOString(),
			}
			setMessages((prev) => [...prev, assistantMessage])
			scrollToBottom()

			try {
				const response = await fetch(`/api/embed/agents/${agentId}/chat`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: content.trim(),
						sessionId,
					}),
				})

				if (!response.ok) {
					const errorData = (await response.json().catch(() => ({
						error: 'Request failed',
					}))) as { error?: string }
					throw new Error(errorData.error || 'Failed to send message')
				}

				const reader = response.body?.getReader()
				if (!reader) throw new Error('No response body')

				const decoder = new TextDecoder()
				let buffer = ''

				while (true) {
					const { done, value } = await reader.read()
					if (done) break

					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split('\n')
					buffer = lines.pop() || ''

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							try {
								const event: ChatStreamEvent = JSON.parse(line.slice(6))

								if (event.type === 'text' && event.content) {
									setMessages((prev) => {
										const updated = [...prev]
										const lastMsg = updated[updated.length - 1]
										if (lastMsg?.role === 'assistant') {
											lastMsg.content += event.content
										}
										return updated
									})
									scrollToBottom()
								} else if (event.type === 'done' && event.sessionId) {
									setSessionId(event.sessionId)
								} else if (event.type === 'error') {
									setError(event.message || 'An error occurred')
								}
							} catch {
								// Ignore parse errors
							}
						}
					}
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to send message')
				// Remove placeholder assistant message
				setMessages((prev) => prev.slice(0, -1))
			} finally {
				setIsStreaming(false)
			}
		},
		[agentId, isStreaming, sessionId, scrollToBottom],
	)

	// Listen for messages from parent window
	useEffect(() => {
		function handleMessage(event: MessageEvent) {
			const data = event.data
			if (!data || typeof data !== 'object') return

			switch (data.type) {
				case 'hare:widget:send':
					if (data.message && !isStreaming) {
						sendMessage(data.message)
					}
					break
				case 'hare:widget:toggle':
					// Widget was opened/closed
					break
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [isStreaming, sendMessage])

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		if (input.trim()) {
			sendMessage(input)
			setInput('')
		}
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	const handleClose = () => {
		window.parent.postMessage({ type: 'hare:widget:close' }, '*')
	}

	// Dynamic styles based on theme
	const containerStyle = {
		'--primary-color': primaryColor,
		backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
		color: isDark ? '#ffffff' : '#1a1a1a',
	} as React.CSSProperties

	if (isLoading) {
		return (
			<div className="flex h-screen w-full items-center justify-center" style={containerStyle}>
				<Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
			</div>
		)
	}

	return (
		<div className="flex h-screen w-full flex-col" style={containerStyle}>
			{/* Header */}
			<div
				className="flex items-center justify-between px-4 py-3 border-b"
				style={{
					borderColor: isDark ? '#333' : '#e5e5e5',
					backgroundColor: isDark ? '#222' : '#fafafa',
				}}
			>
				<div className="flex items-center gap-3">
					<div
						className="flex h-8 w-8 items-center justify-center rounded-lg"
						style={{ backgroundColor: primaryColor }}
					>
						<Bot className="h-4 w-4 text-white" />
					</div>
					<span className="font-medium text-sm">{agentName}</span>
				</div>
				<button
					type="button"
					onClick={handleClose}
					className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
					aria-label="Close chat"
				>
					<X className="h-4 w-4" style={{ color: isDark ? '#888' : '#666' }} />
				</button>
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center px-4">
						<div
							className="flex h-12 w-12 items-center justify-center rounded-xl mb-3"
							style={{ backgroundColor: `${primaryColor}20` }}
						>
							<Bot className="h-6 w-6" style={{ color: primaryColor }} />
						</div>
						<p className="text-sm" style={{ color: isDark ? '#888' : '#666' }}>
							Send a message to start chatting
						</p>
					</div>
				) : (
					messages.map((message) => (
						<div
							key={message.id}
							className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
						>
							<div
								className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
								style={{
									backgroundColor:
										message.role === 'user' ? primaryColor : isDark ? '#333' : '#e5e5e5',
								}}
							>
								{message.role === 'user' ? (
									<User className="h-3.5 w-3.5 text-white" />
								) : (
									<Bot className="h-3.5 w-3.5" style={{ color: isDark ? '#ccc' : '#666' }} />
								)}
							</div>
							<div
								className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
									message.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
								}`}
								style={{
									backgroundColor:
										message.role === 'user' ? primaryColor : isDark ? '#333' : '#f0f0f0',
									color: message.role === 'user' ? '#ffffff' : 'inherit',
								}}
							>
								<p className="whitespace-pre-wrap break-words">{message.content}</p>
							</div>
						</div>
					))
				)}

				{/* Streaming indicator */}
				{isStreaming &&
					messages[messages.length - 1]?.role === 'assistant' &&
					!messages[messages.length - 1]?.content && (
						<div className="flex gap-2">
							<div
								className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
								style={{ backgroundColor: isDark ? '#333' : '#e5e5e5' }}
							>
								<Loader2
									className="h-3.5 w-3.5 animate-spin"
									style={{ color: isDark ? '#ccc' : '#666' }}
								/>
							</div>
							<div
								className="rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm"
								style={{ backgroundColor: isDark ? '#333' : '#f0f0f0' }}
							>
								<span style={{ color: isDark ? '#888' : '#666' }}>Thinking...</span>
							</div>
						</div>
					)}

				{/* Error display */}
				{error && (
					<div
						className="text-center py-2 px-3 rounded-lg text-sm"
						style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
					>
						{error}
					</div>
				)}
			</div>

			{/* Input */}
			<div className="border-t px-4 py-3" style={{ borderColor: isDark ? '#333' : '#e5e5e5' }}>
				<form onSubmit={handleSubmit} className="flex gap-2">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						disabled={isStreaming}
						rows={1}
						className="flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors"
						style={{
							backgroundColor: isDark ? '#222' : '#f5f5f5',
							borderColor: isDark ? '#444' : '#e0e0e0',
							color: 'inherit',
							minHeight: '42px',
							maxHeight: '120px',
						}}
					/>
					<button
						type="submit"
						disabled={!input.trim() || isStreaming}
						className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
						style={{ backgroundColor: primaryColor }}
					>
						{isStreaming ? (
							<Loader2 className="h-4 w-4 animate-spin text-white" />
						) : (
							<Send className="h-4 w-4 text-white" />
						)}
					</button>
				</form>
				<p className="mt-2 text-center text-xs" style={{ color: isDark ? '#666' : '#999' }}>
					Powered by Hare
				</p>
			</div>
		</div>
	)
}
