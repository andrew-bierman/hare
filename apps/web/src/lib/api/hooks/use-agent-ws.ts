'use client'

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
	/** Auto-reconnect on disconnect */
	autoReconnect?: boolean
	/** Reconnect interval in ms */
	reconnectInterval?: number
	/** Maximum reconnect attempts */
	maxReconnectAttempts?: number
	/** Callback when connected */
	onConnect?: () => void
	/** Callback when disconnected */
	onDisconnect?: () => void
	/** Callback when state updates */
	onStateUpdate?: (state: HareAgentState) => void
	/** Callback when error occurs */
	onError?: (error: string) => void
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
	/** Execute a tool */
	executeTool: (toolId: string, params: Record<string, unknown>) => void
	/** Schedule a task */
	scheduleTask: (action: string, executeAt?: number, cron?: string, payload?: Record<string, unknown>) => void
	/** Get current state */
	refreshState: () => void
	/** Connect to agent */
	connect: () => void
	/** Disconnect from agent */
	disconnect: () => void
	/** Clear messages */
	clearMessages: () => void
}

/**
 * Build WebSocket URL for agent connection.
 */
function buildWebSocketUrl(agentId: string, userId?: string): string {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
	const host = window.location.host
	let url = `${protocol}//${host}/api/agent-ws/agents/${agentId}/ws`
	if (userId) {
		url += `?userId=${encodeURIComponent(userId)}`
	}
	return url
}

/**
 * React hook for WebSocket connection to a Cloudflare Agent.
 *
 * Provides real-time bidirectional communication with state sync.
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
 * // Send a message
 * sendMessage('Hello!')
 * ```
 */
export function useAgentWebSocket(options: UseAgentWebSocketOptions): UseAgentWebSocketReturn {
	const {
		agentId,
		userId,
		autoReconnect = true,
		reconnectInterval = 3000,
		maxReconnectAttempts = 5,
		onConnect,
		onDisconnect,
		onStateUpdate,
		onError,
	} = options

	// Refs
	const wsRef = useRef<WebSocket | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// State
	const [status, setStatus] = useState<ConnectionStatus>('disconnected')
	const [agentState, setAgentState] = useState<HareAgentState | null>(null)
	const [messages, setMessages] = useState<AgentMessage[]>([])
	const [isProcessing, setIsProcessing] = useState(false)
	const [streamingText, setStreamingText] = useState('')
	const [error, setError] = useState<string | null>(null)

	/**
	 * Send a message through WebSocket.
	 */
	const send = useCallback((message: ClientMessage) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message))
		}
	}, [])

	/**
	 * Handle incoming WebSocket message.
	 */
	const handleMessage = useCallback((event: MessageEvent) => {
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
					onStateUpdate?.(state)
					break
				}

				case 'tool_call': {
					// Tool is being called - could show in UI
					break
				}

				case 'tool_result': {
					// Tool result received - could show in UI
					break
				}

				case 'done': {
					// Finalize the streaming message
					setMessages((prev) => {
						const updated = [...prev]
						const lastMessage = updated[updated.length - 1]
						if (lastMessage?.role === 'assistant') {
							lastMessage.content = streamingText
						}
						return updated
					})
					setStreamingText('')
					setIsProcessing(false)
					break
				}

				case 'error': {
					const data = serverMessage.data as { message: string }
					setError(data.message)
					setIsProcessing(false)
					onError?.(data.message)
					break
				}
			}
		} catch (err) {
			console.error('Failed to parse WebSocket message:', err)
		}
	}, [streamingText, onStateUpdate, onError])

	/**
	 * Connect to the agent WebSocket.
	 */
	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return
		}

		setStatus('connecting')
		setError(null)

		const ws = new WebSocket(buildWebSocketUrl(agentId, userId))

		ws.onopen = () => {
			setStatus('connected')
			reconnectAttemptsRef.current = 0
			onConnect?.()
		}

		ws.onmessage = handleMessage

		ws.onerror = () => {
			setStatus('error')
			setError('WebSocket connection error')
		}

		ws.onclose = () => {
			setStatus('disconnected')
			onDisconnect?.()

			// Auto-reconnect logic
			if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
				reconnectAttemptsRef.current++
				reconnectTimeoutRef.current = setTimeout(() => {
					connect()
				}, reconnectInterval)
			}
		}

		wsRef.current = ws
	}, [agentId, userId, autoReconnect, reconnectInterval, maxReconnectAttempts, handleMessage, onConnect, onDisconnect])

	/**
	 * Disconnect from the agent.
	 */
	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}
		reconnectAttemptsRef.current = maxReconnectAttempts // Prevent auto-reconnect

		if (wsRef.current) {
			wsRef.current.close()
			wsRef.current = null
		}
	}, [maxReconnectAttempts])

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
	 * Execute a tool.
	 */
	const executeTool = useCallback((toolId: string, params: Record<string, unknown>) => {
		send({
			type: 'execute_tool',
			payload: { toolId, params },
		})
	}, [send])

	/**
	 * Schedule a task.
	 */
	const scheduleTask = useCallback((
		action: string,
		executeAt?: number,
		cron?: string,
		payload?: Record<string, unknown>,
	) => {
		send({
			type: 'schedule',
			payload: { action, executeAt, cron, payload },
		})
	}, [send])

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

	// Update streaming message in real-time
	useEffect(() => {
		if (streamingText) {
			setMessages((prev) => {
				const updated = [...prev]
				const lastMessage = updated[updated.length - 1]
				if (lastMessage?.role === 'assistant') {
					lastMessage.content = streamingText
				}
				return updated
			})
		}
	}, [streamingText])

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		connect()
		return () => {
			disconnect()
		}
	}, [connect, disconnect])

	return {
		status,
		agentState,
		messages,
		isProcessing,
		streamingText,
		error,
		sendMessage,
		executeTool,
		scheduleTask,
		refreshState,
		connect,
		disconnect,
		clearMessages,
	}
}

/**
 * Simpler hook that just manages connection status.
 */
export function useAgentConnection(agentId: string, userId?: string) {
	const [isConnected, setIsConnected] = useState(false)

	const result = useAgentWebSocket({
		agentId,
		userId,
		onConnect: () => setIsConnected(true),
		onDisconnect: () => setIsConnected(false),
	})

	return {
		...result,
		isConnected,
	}
}
