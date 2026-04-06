'use client'

import { useChat as useAIChat } from '@ai-sdk/react'
import { client } from '@hare/api/client'
import { useQuery } from '@tanstack/react-query'
import { DefaultChatTransport } from 'ai'
import { useMemo, useRef, useState } from 'react'

// =============================================================================
// Types (inferred from oRPC)
// =============================================================================

// Helper to unwrap Eden Treaty response
async function unwrap<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
	const { data, error } = await promise
	if (error) throw error
	return data as T
}

export interface Conversation {
	id: string
	agentId: string
	title: string | null
	createdAt: string
	updatedAt: string
}

export interface Message {
	id: string
	conversationId: string
	role: string
	content: string
	createdAt: string
	parts?: Array<{ type: string; text?: string }>
}

// =============================================================================
// Query Hooks (using oRPC)
// =============================================================================

export function useConversationsQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['conversations', agentId],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled: !!agentId
		queryFn: () => unwrap(client.api.chat.agents({ id: agentId! }).conversations.get()),
		enabled: !!agentId,
	})
}

export function useMessagesQuery(conversationId: string | undefined) {
	return useQuery({
		queryKey: ['messages', conversationId],
		// biome-ignore lint/style/noNonNullAssertion: guarded by enabled: !!conversationId
		queryFn: () => unwrap(client.api.chat.conversations({ id: conversationId! }).messages.get()),
		enabled: !!conversationId,
	})
}

// =============================================================================
// Search Hook
// =============================================================================

export interface ConversationSearchResult {
	messageId: string
	conversationId: string
	conversationTitle: string | null
	role: 'user' | 'assistant' | 'system'
	content: string
	highlightedContent: string
	createdAt: string
}

export interface ConversationSearchParams {
	agentId: string
	query: string
	dateFrom?: string
	dateTo?: string
	limit?: number
	offset?: number
}

export function useConversationSearchQuery(params: ConversationSearchParams | undefined) {
	const { agentId, query, dateFrom, dateTo, limit, offset } = params ?? {}

	return useQuery({
		queryKey: ['conversations', 'search', agentId, query, dateFrom, dateTo, limit, offset],
		queryFn: () =>
			unwrap(
				// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check below
				client.api.chat
					.agents({ id: agentId! })
					.conversations.search.get({
						query: {
							// biome-ignore lint/style/noNonNullAssertion: guarded by enabled check below
							query: query!,
							dateFrom,
							dateTo,
							limit,
							offset,
						} as any,
					}),
			),
		enabled: !!agentId && !!query && query.trim().length > 0,
	})
}

// =============================================================================
// Chat Hook (using AI SDK for streaming)
// =============================================================================

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
 *
 * Note: This uses direct fetch() to the streaming endpoint rather than oRPC,
 * as the AI SDK has its own streaming protocol that works best with the Hono endpoint.
 */
export function useChat(agentId: string | undefined) {
	const [sessionId, setSessionId] = useState<string | null>(null)
	const sessionIdRef = useRef(sessionId)
	sessionIdRef.current = sessionId

	// Custom fetch to capture session ID from response header
	const fetchWithSessionCapture = useMemo(
		() => async (url: RequestInfo | URL, init?: RequestInit) => {
			const response = await fetch(url, init)
			const newSessionId = response.headers.get('X-Session-Id')
			if (newSessionId && !sessionIdRef.current) {
				setSessionId(newSessionId)
			}
			return response
		},
		[],
	)

	// Create transport with the agent-specific API endpoint
	const transport = useMemo(() => {
		if (!agentId) return undefined
		return new DefaultChatTransport({
			api: `/api/stream-chat/agents/${agentId}/chat`,
			body: () => (sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
			fetch: fetchWithSessionCapture as typeof globalThis.fetch,
		})
	}, [agentId, fetchWithSessionCapture])

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

// =============================================================================
// Backwards Compatibility Types
// =============================================================================

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
