'use client'

import { useChat as useAIChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
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
	// Use ref to access current sessionId without recreating transport
	const sessionIdRef = useRef<string | null>(null)
	sessionIdRef.current = sessionId

	// Create a stable ref for the setSessionId to avoid recreating fetch
	const setSessionIdRef = useRef(setSessionId)
	setSessionIdRef.current = setSessionId

	// Custom fetch that captures X-Session-Id header
	const customFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
		const response = await fetch(url, init)

		// Extract session ID from response header
		const headerSessionId = response.headers.get('X-Session-Id')
		if (headerSessionId && !sessionIdRef.current) {
			setSessionIdRef.current(headerSessionId)
		}

		return response
	}, [])

	// Create transport with the agent-specific API endpoint
	const transport = useMemo(() => {
		if (!agentId) return undefined
		return new DefaultChatTransport({
			api: `/api/chat/agents/${agentId}/chat`,
			body: { sessionId: sessionIdRef.current },
			fetch: customFetch,
		})
	}, [agentId, customFetch])

	const chat = useAIChat({
		id: agentId,
		transport,
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
