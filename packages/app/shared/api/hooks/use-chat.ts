'use client'

import { useChat as useAIChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { DefaultChatTransport } from 'ai'
import { orpc } from '@hare/api-client'

// =============================================================================
// Types (inferred from oRPC)
// =============================================================================

type ConversationsOutput = Awaited<ReturnType<typeof orpc.chat.listConversations>>
type MessagesOutput = Awaited<ReturnType<typeof orpc.chat.getMessages>>

export type Conversation = ConversationsOutput['conversations'][number]
export type Message = MessagesOutput['messages'][number] & {
	parts?: Array<{ type: string; text?: string }>
}

// =============================================================================
// Query Hooks (using oRPC)
// =============================================================================

export function useConversationsQuery(agentId: string | undefined) {
	return useQuery({
		queryKey: ['conversations', agentId],
		queryFn: () => orpc.chat.listConversations({ id: agentId! }),
		enabled: !!agentId,
	})
}

export function useMessagesQuery(conversationId: string | undefined) {
	return useQuery({
		queryKey: ['messages', conversationId],
		queryFn: () => orpc.chat.getMessages({ id: conversationId! }),
		enabled: !!conversationId,
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
	const fetchWithSessionCapture = async (url: RequestInfo | URL, init?: RequestInit) => {
		const response = await fetch(url, init)
		const newSessionId = response.headers.get('X-Session-Id')
		if (newSessionId && !sessionIdRef.current) {
			setSessionId(newSessionId)
		}
		return response
	}

	// Create transport with the agent-specific API endpoint
	const transport = useMemo(() => {
		if (!agentId) return undefined
		return new DefaultChatTransport({
			api: `/api/chat/agents/${agentId}/chat`,
			body: sessionIdRef.current ? { sessionId: sessionIdRef.current } : {},
			fetch: fetchWithSessionCapture as typeof globalThis.fetch,
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [agentId])

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
