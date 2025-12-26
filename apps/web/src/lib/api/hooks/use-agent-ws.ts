'use client'

/**
 * Agent WebSocket Hook
 *
 * A React hook for WebSocket connection to Cloudflare Agents.
 * Provides real-time bidirectional communication with state sync.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HareAgentState, ServerMessage, ClientMessage } from 'web-app/lib/agents'

/**
 * Message in the chat.
 */
export interface AgentMessage {
	id: string
	role: 'user' | 'assistant' | 'system'
	content: string
	createdAt: string
}

/**
 * Connection status.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Options for useAgentWebSocket hook.
 */
export interface UseAgentWebSocketOptions {
	/** Agent ID to connect to */
	agentId: string
	/** User ID for identification */
	userId?: string
	/** Callback when state updates */
	onStateUpdate?: (state: HareAgentState) => void
}

/**
 * Hook return value.
 */
export interface UseAgentWebSocketReturn {
	/** Connection status */
	status: ConnectionStatus
	/** Agent state (synced from server) */
	agentState: HareAgentState | null
	/** Local messages (for optimistic UI) */
	messages: AgentMessage[]
	/** Whether agent is processing */
	isProcessing: boolean
	/** Current streaming text */
	streamingText: string
	/** Last error */
	error: string | null
	/** Send a chat message */
	sendMessage: (content: string) => void
	/** Clear messages */
	clearMessages: () => void
	/** Stop generation */
	stop: () => void
	/** Refresh/reconnect */
	refreshState: () => void
}

/**
 * Build WebSocket URL for agent connection.
 */
function buildWebSocketUrl(agentId: string, userId?: string): string {
	const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
	const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
	let url = `${protocol}//${host}/api/agent-ws/agents/${agentId}/ws`
	if (userId) {
		url += `?userId=${encodeURIComponent(userId)}`
	}
	return url
}

/**
 * React hook for WebSocket connection to a Cloudflare Agent.
 *
 * @example
 * ```tsx
 * const {
 *   status,
 *   messages,
 *   isProcessing,
 *   sendMessage,
 * } = useAgentWebSocket({
 *   agentId: 'my-agent-id',
 *   userId: 'user-123',
 * })
 *
 * sendMessage('Hello!')
 * ```
 */
export function useAgentWebSocket(options: UseAgentWebSocketOptions): UseAgentWebSocketReturn {
	const { agentId, userId, onStateUpdate } = options

	// Refs for stable values
	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const streamingTextRef = useRef('')
	const mountedRef = useRef(true)
	const onStateUpdateRef = useRef(onStateUpdate)

	// Keep callback ref updated
	useEffect(() => {
		onStateUpdateRef.current = onStateUpdate
	}, [onStateUpdate])

	// State
	const [status, setStatus] = useState<ConnectionStatus>('disconnected')
	const [agentState, setAgentState] = useState<HareAgentState | null>(null)
	const [messages, setMessages] = useState<AgentMessage[]>([])
	const [isProcessing, setIsProcessing] = useState(false)
	const [streamingText, setStreamingText] = useState('')
	const [error, setError] = useState<string | null>(null)

	// Keep streamingTextRef in sync
	useEffect(() => {
		streamingTextRef.current = streamingText
	}, [streamingText])

	/**
	 * Send a message through WebSocket.
	 */
	const send = useCallback((message: ClientMessage) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message))
		}
	}, [])

	/**
	 * Connect to the agent WebSocket.
	 */
	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN || !mountedRef.current) {
			return
		}

		setStatus('connecting')
		setError(null)

		const ws = new WebSocket(buildWebSocketUrl(agentId, userId))

		ws.onopen = () => {
			if (!mountedRef.current) {
				ws.close()
				return
			}
			setStatus('connected')
		}

		ws.onmessage = (event) => {
			if (!mountedRef.current) return

			try {
				const serverMessage = JSON.parse(event.data) as ServerMessage

				switch (serverMessage.type) {
					case 'text': {
						const data = serverMessage.data as { content: string }
						setStreamingText((prev) => prev + data.content)
						break
					}

					case 'state_update': {
						const state = serverMessage.data as HareAgentState
						setAgentState(state)
						setIsProcessing(state.isProcessing)
						onStateUpdateRef.current?.(state)
						break
					}

					case 'done': {
						const finalText = streamingTextRef.current
						setMessages((prev) => {
							if (prev.length === 0) return prev
							const lastMessage = prev[prev.length - 1]
							if (lastMessage?.role !== 'assistant') return prev
							return [
								...prev.slice(0, -1),
								{ ...lastMessage, content: finalText },
							]
						})
						setStreamingText('')
						setIsProcessing(false)
						break
					}

					case 'error': {
						const data = serverMessage.data as { message: string }
						setError(data.message)
						setIsProcessing(false)
						break
					}
				}
			} catch (err) {
				console.error('Failed to parse WebSocket message:', err)
			}
		}

		ws.onerror = () => {
			if (!mountedRef.current) return
			setStatus('error')
			setError('WebSocket connection error')
		}

		ws.onclose = () => {
			if (!mountedRef.current) return
			setStatus('disconnected')

			// Auto-reconnect after 3 seconds
			if (mountedRef.current) {
				reconnectTimeoutRef.current = setTimeout(() => {
					if (mountedRef.current) {
						connect()
					}
				}, 3000)
			}
		}

		wsRef.current = ws
	}, [agentId, userId])

	/**
	 * Disconnect from the agent.
	 */
	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (wsRef.current) {
			wsRef.current.close()
			wsRef.current = null
		}
	}, [])

	/**
	 * Send a chat message.
	 */
	const sendMessage = useCallback((content: string) => {
		if (!content.trim()) return

		// Add user message optimistically
		const userMessage: AgentMessage = {
			id: `user-${Date.now()}`,
			role: 'user',
			content,
			createdAt: new Date().toISOString(),
		}
		setMessages((prev) => [...prev, userMessage])

		// Add placeholder for assistant response
		const assistantMessage: AgentMessage = {
			id: `assistant-${Date.now()}`,
			role: 'assistant',
			content: '',
			createdAt: new Date().toISOString(),
		}
		setMessages((prev) => [...prev, assistantMessage])

		setIsProcessing(true)
		setStreamingText('')
		setError(null)

		// Send to agent
		send({
			type: 'chat',
			payload: {
				message: content,
				userId: userId || 'anonymous',
			},
		})
	}, [send, userId])

	/**
	 * Request current state.
	 */
	const refreshState = useCallback(() => {
		send({ type: 'get_state', payload: {} })
	}, [send])

	/**
	 * Clear messages.
	 */
	const clearMessages = useCallback(() => {
		setMessages([])
		setStreamingText('')
		setError(null)
	}, [])

	/**
	 * Stop generation (close and reconnect).
	 */
	const stop = useCallback(() => {
		disconnect()
		setIsProcessing(false)
		// Reconnect after a short delay
		setTimeout(() => {
			if (mountedRef.current) {
				connect()
			}
		}, 100)
	}, [disconnect, connect])

	// Update streaming message in real-time (immutably)
	useEffect(() => {
		if (streamingText) {
			setMessages((prev) => {
				if (prev.length === 0) return prev
				const lastMessage = prev[prev.length - 1]
				if (lastMessage?.role !== 'assistant') return prev
				return [
					...prev.slice(0, -1),
					{ ...lastMessage, content: streamingText },
				]
			})
		}
	}, [streamingText])

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		mountedRef.current = true
		connect()

		return () => {
			mountedRef.current = false
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}
			disconnect()
		}
	}, [agentId, userId, connect, disconnect])

	return {
		status,
		agentState,
		messages,
		isProcessing,
		streamingText,
		error,
		sendMessage,
		clearMessages,
		stop,
		refreshState,
	}
}
