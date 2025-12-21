'use client'

import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// Helper to extract error message from API response
function getErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
		return error.error
	}
	return fallback
}

// Explicit types matching the API schema
export interface Message {
	id: string
	conversationId: string
	role: 'user' | 'assistant' | 'system'
	content: string
	createdAt: string
}

export interface Conversation {
	id: string
	agentId: string
	userId: string
	title: string
	messageCount: number
	createdAt: string
	updatedAt: string
}

export interface ChatUsage {
	tokensIn: number
	tokensOut: number
	latencyMs: number
}

export interface ChatStreamEvent {
	type: 'text' | 'done' | 'error'
	content?: string
	sessionId?: string
	usage?: ChatUsage
	message?: string
}

async function fetchConversations(agentId: string): Promise<{ conversations: Conversation[] }> {
	const response = await fetch(`/api/chat/agents/${agentId}/conversations`)
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch conversations'))
	}
	return response.json()
}

async function fetchMessages(conversationId: string): Promise<{ messages: Message[] }> {
	const response = await fetch(`/api/chat/conversations/${conversationId}/messages`)
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		throw new Error(getErrorMessage(error, 'Failed to fetch messages'))
	}
	return response.json()
}

export function useConversations(agentId: string | undefined) {
	return useQuery({
		queryKey: ['conversations', agentId],
		queryFn: () => fetchConversations(agentId!),
		enabled: !!agentId,
	})
}

export function useMessages(conversationId: string | undefined) {
	return useQuery({
		queryKey: ['messages', conversationId],
		queryFn: () => fetchMessages(conversationId!),
		enabled: !!conversationId,
	})
}

export function useChat(agentId: string | undefined) {
	const [isStreaming, setIsStreaming] = useState(false)
	const [messages, setMessages] = useState<Message[]>([])
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const sendMessage = useCallback(
		async (content: string) => {
			if (!agentId || isStreaming) return

			setIsStreaming(true)
			setError(null)

			// Add user message immediately
			const userMessage: Message = {
				id: `temp-${Date.now()}`,
				conversationId: sessionId || '',
				role: 'user',
				content,
				createdAt: new Date().toISOString(),
			}
			setMessages((prev) => [...prev, userMessage])

			// Create placeholder for assistant response
			const assistantMessage: Message = {
				id: `temp-assistant-${Date.now()}`,
				conversationId: sessionId || '',
				role: 'assistant',
				content: '',
				createdAt: new Date().toISOString(),
			}
			setMessages((prev) => [...prev, assistantMessage])

			try {
				const response = await fetch(`/api/chat/agents/${agentId}/chat`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: content,
						sessionId,
					}),
				})

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}))
					throw new Error(getErrorMessage(errorData, 'Failed to send message'))
				}

				const reader = response.body?.getReader()
				if (!reader) {
					throw new Error('No response body')
				}

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
										const lastMessage = updated[updated.length - 1]
										if (lastMessage && lastMessage.role === 'assistant') {
											lastMessage.content += event.content
										}
										return updated
									})
								} else if (event.type === 'done' && event.sessionId) {
									setSessionId(event.sessionId)
								} else if (event.type === 'error') {
									setError(event.message || 'An error occurred')
								}
							} catch {
								// Ignore parse errors for malformed events
							}
						}
					}
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to send message')
				// Remove the placeholder assistant message on error
				setMessages((prev) => prev.slice(0, -1))
			} finally {
				setIsStreaming(false)
			}
		},
		[agentId, isStreaming, sessionId]
	)

	const clearMessages = useCallback(() => {
		setMessages([])
		setSessionId(null)
		setError(null)
	}, [])

	return {
		messages,
		isStreaming,
		error,
		sessionId,
		sendMessage,
		clearMessages,
	}
}
