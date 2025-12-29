'use client'

import { useChat as useAIChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { DefaultChatTransport } from 'ai'

// Helper to extract error message from API response
function getErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
		return error.error
	}
	return fallback
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

async function fetchConversations(agentId: string): Promise<{ conversations: Conversation[] }> {
	const response = await fetch(`/api/chat/agents/${agentId}/conversations`)
	if (!response.ok) {
		let error: unknown = null
		try {
			error = await response.json()
		} catch {
			error = { error: response.statusText || 'Unknown error' }
		}
		throw new Error(getErrorMessage(error, 'Failed to fetch conversations'))
	}
	return response.json()
}

async function fetchMessages(
	conversationId: string,
): Promise<{ messages: Array<{ id: string; role: string; content: string }> }> {
	const response = await fetch(`/api/chat/conversations/${conversationId}/messages`)
	if (!response.ok) {
		let error: unknown = null
		try {
			error = await response.json()
		} catch {
			error = { error: response.statusText || 'Unknown error' }
		}
		throw new Error(getErrorMessage(error, 'Failed to fetch messages'))
	}
	return response.json()
}

export function useConversationsQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['conversations', agentId],
		queryFn: () => fetchConversations(agentId!),
		enabled: !!agentId,
	})
}

export function useMessagesQuery(conversationId: string | undefined) {
	return useQuery({
		queryKey: ['messages', conversationId],
		queryFn: () => fetchMessages(conversationId!),
		enabled: !!conversationId,
	})
}

/**
 * Helper to extract text content from AI SDK v6 message parts
 */
function getMessageContent(message: { parts?: Array<{ type: string; text?: string }> }): string {
	if (!message.parts) return ''
	return message.parts
		.filter((part) => part.type === 'text' && part.text)
		.map((part) => part.text)
		.join('')
}

/**
 * Chat hook powered by Vercel AI SDK v6.
 * Provides streaming chat functionality with automatic message management.
 */
export function useChat(agentId: string | undefined) {
	const [sessionId, setSessionId] = useState<string | null>(null)

	// Create transport with the agent-specific API endpoint
	const transport = useMemo(() => {
		if (!agentId) return undefined
		return new DefaultChatTransport({
			api: `/api/chat/agents/${agentId}/chat`,
			body: { sessionId },
		})
	}, [agentId, sessionId])

	const chat = useAIChat({
		id: agentId,
		transport,
		onFinish: ({ message }) => {
			// Session ID is now managed by the server via the conversation ID
			// The message metadata could be used to extract session info if needed
			const msgSessionId = message.id?.split('-')[0] // Extract from message ID if present
			if (msgSessionId && !sessionId) {
				setSessionId(msgSessionId)
			}
		},
	})

	// Transform messages to a simpler format for backwards compatibility
	const messages = chat.messages.map((msg) => ({
		id: msg.id,
		role: msg.role as 'user' | 'assistant' | 'system',
		content: getMessageContent(msg),
		parts: msg.parts,
	}))

	return {
		messages,
		isStreaming: chat.status === 'streaming' || chat.status === 'submitted',
		status: chat.status,
		error: chat.error?.message ?? null,
		sessionId,
		sendMessage: (content: string) => chat.sendMessage({ text: content }),
		clearMessages: () => {
			chat.setMessages([])
			setSessionId(null)
		},
		stop: chat.stop,
	}
}

// Re-export types for backwards compatibility
export interface Message {
	id: string
	role: 'user' | 'assistant' | 'system'
	content: string
	parts?: Array<{ type: string; text?: string }>
}

export interface ChatUsage {
	tokensIn: number
	tokensOut: number
	latencyMs: number
}

export interface ChatStreamEventData {
	type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error'
	content?: string
	sessionId?: string
	usage?: ChatUsage
	message?: string
}

export interface ToolCallData {
	id: string
	name: string
	args: Record<string, unknown>
	status: 'pending' | 'running' | 'completed' | 'error'
	result?: unknown
	error?: string
}
