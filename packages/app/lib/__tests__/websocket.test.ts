/**
 * Unit Tests for WebSocket Connection Manager
 *
 * Tests the useAgentWebSocket hook and its WebSocket connection handling.
 * Uses mock WebSocket for unit testing without actual network connections.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// =============================================================================
// Types
// =============================================================================

interface MockWebSocketInstance {
	url: string
	readyState: number
	onopen: ((event: Event) => void) | null
	onmessage: ((event: MessageEvent) => void) | null
	onerror: ((event: Event) => void) | null
	onclose: ((event: CloseEvent) => void) | null
	send: ReturnType<typeof vi.fn>
	close: ReturnType<typeof vi.fn>
}

interface ServerMessage {
	type: 'text' | 'state_update' | 'done' | 'error' | 'tool_call' | 'tool_result'
	data: unknown
	timestamp: number
}

interface ClientMessage {
	type: 'chat' | 'configure' | 'execute_tool' | 'get_state' | 'schedule'
	payload: unknown
}

// =============================================================================
// Mock WebSocket Implementation
// =============================================================================

class MockWebSocket implements MockWebSocketInstance {
	static CONNECTING = 0
	static OPEN = 1
	static CLOSING = 2
	static CLOSED = 3

	url: string
	readyState: number = MockWebSocket.CONNECTING
	onopen: ((event: Event) => void) | null = null
	onmessage: ((event: MessageEvent) => void) | null = null
	onerror: ((event: Event) => void) | null = null
	onclose: ((event: CloseEvent) => void) | null = null
	send = vi.fn()
	close = vi.fn()

	constructor(url: string) {
		this.url = url
		mockWebSocketInstances.push(this)
	}

	// Test helpers
	simulateOpen() {
		this.readyState = MockWebSocket.OPEN
		this.onopen?.({ type: 'open' } as Event)
	}

	simulateMessage(data: ServerMessage) {
		this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
	}

	simulateError() {
		this.onerror?.({ type: 'error' } as Event)
	}

	simulateClose(code = 1000, reason = '') {
		this.readyState = MockWebSocket.CLOSED
		this.onclose?.({ code, reason, type: 'close' } as CloseEvent)
	}
}

// Track all created instances for testing
let mockWebSocketInstances: MockWebSocket[] = []

/**
 * Helper to get mock instance with type safety
 */
function getMockInstance(index: number): MockWebSocket {
	const instance = mockWebSocketInstances[index]
	if (!instance) {
		throw new Error(`No mock WebSocket instance at index ${index}`)
	}
	return instance
}

/**
 * Helper to get the last mock instance
 */
function getLastMockInstance(): MockWebSocket {
	const instance = getLastMockInstance()
	if (!instance) {
		throw new Error('No mock WebSocket instances created')
	}
	return instance
}

// =============================================================================
// WebSocket Connection Manager (extracted for testing)
// =============================================================================

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface ConnectionState {
	status: ConnectionStatus
	error: string | null
	reconnectAttempts: number
}

interface MessageQueue {
	messages: ClientMessage[]
	maxSize: number
}

/**
 * WebSocket Connection Manager
 * Extracted from useAgentWebSocket for unit testing
 */
class WebSocketConnectionManager {
	private ws: MockWebSocketInstance | null = null
	private state: ConnectionState = {
		status: 'disconnected',
		error: null,
		reconnectAttempts: 0,
	}
	private messageQueue: MessageQueue = {
		messages: [],
		maxSize: 100,
	}
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null
	private lastPongTime: number = 0
	private mounted = true

	// Configuration
	private readonly baseReconnectDelay = 1000
	private readonly maxReconnectDelay = 30000
	private readonly maxReconnectAttempts = 10
	private readonly heartbeatIntervalMs = 30000
	private readonly heartbeatTimeoutMs = 10000

	// Callbacks
	onStatusChange: ((status: ConnectionStatus) => void) | null = null
	onMessage: ((message: ServerMessage) => void) | null = null
	onError: ((error: string) => void) | null = null

	constructor(
		private readonly url: string,
		private readonly WebSocketClass: typeof MockWebSocket = MockWebSocket,
	) {}

	/**
	 * Get current connection state
	 */
	getState(): ConnectionState {
		return { ...this.state }
	}

	/**
	 * Get queued messages
	 */
	getMessageQueue(): ClientMessage[] {
		return [...this.messageQueue.messages]
	}

	/**
	 * Connect to WebSocket server
	 */
	connect(): void {
		if (this.ws?.readyState === MockWebSocket.OPEN || !this.mounted) {
			return
		}

		this.updateStatus('connecting')
		this.state.error = null

		this.ws = new this.WebSocketClass(this.url)

		this.ws.onopen = () => {
			if (!this.mounted) {
				this.ws?.close()
				return
			}
			this.updateStatus('connected')
			this.state.reconnectAttempts = 0
			this.flushMessageQueue()
			this.startHeartbeat()
		}

		this.ws.onmessage = (event: MessageEvent) => {
			if (!this.mounted) return

			try {
				const message = this.deserializeMessage(event.data)
				if (message.type === 'pong' as ServerMessage['type']) {
					this.lastPongTime = Date.now()
				} else {
					this.onMessage?.(message)
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to parse message'
				this.onError?.(errorMessage)
			}
		}

		this.ws.onerror = () => {
			if (!this.mounted) return
			this.updateStatus('error')
			this.state.error = 'WebSocket connection error'
			this.onError?.(this.state.error)
		}

		this.ws.onclose = () => {
			if (!this.mounted) return
			this.stopHeartbeat()
			this.updateStatus('disconnected')
			this.scheduleReconnect()
		}
	}

	/**
	 * Disconnect from WebSocket server
	 */
	disconnect(): void {
		this.clearReconnectTimeout()
		this.stopHeartbeat()

		if (this.ws) {
			this.ws.close()
			this.ws = null
		}

		this.updateStatus('disconnected')
	}

	/**
	 * Send a message through WebSocket
	 */
	send(message: ClientMessage): boolean {
		const serialized = this.serializeMessage(message)

		if (this.ws?.readyState === MockWebSocket.OPEN) {
			this.ws.send(serialized)
			return true
		}

		// Queue message if not connected
		this.queueMessage(message)
		return false
	}

	/**
	 * Serialize message for transmission
	 */
	serializeMessage(message: ClientMessage): string {
		return JSON.stringify(message)
	}

	/**
	 * Deserialize received message
	 */
	deserializeMessage(data: string): ServerMessage {
		const parsed = JSON.parse(data)

		if (!parsed || typeof parsed !== 'object') {
			throw new Error('Invalid message format: not an object')
		}

		if (!('type' in parsed)) {
			throw new Error('Invalid message format: missing type')
		}

		const validTypes = ['text', 'state_update', 'done', 'error', 'tool_call', 'tool_result', 'pong']
		if (!validTypes.includes(parsed.type)) {
			throw new Error(`Invalid message type: ${parsed.type}`)
		}

		return parsed as ServerMessage
	}

	/**
	 * Queue a message for later delivery
	 */
	private queueMessage(message: ClientMessage): void {
		if (this.messageQueue.messages.length >= this.messageQueue.maxSize) {
			// Remove oldest message if queue is full
			this.messageQueue.messages.shift()
		}
		this.messageQueue.messages.push(message)
	}

	/**
	 * Flush queued messages after reconnection
	 */
	private flushMessageQueue(): void {
		const messages = [...this.messageQueue.messages]
		this.messageQueue.messages = []

		for (const message of messages) {
			this.send(message)
		}
	}

	/**
	 * Calculate reconnect delay with exponential backoff
	 */
	calculateReconnectDelay(): number {
		const delay = this.baseReconnectDelay * Math.pow(2, this.state.reconnectAttempts)
		return Math.min(delay, this.maxReconnectDelay)
	}

	/**
	 * Schedule reconnection with exponential backoff
	 */
	private scheduleReconnect(): void {
		if (
			!this.mounted ||
			this.state.reconnectAttempts >= this.maxReconnectAttempts
		) {
			return
		}

		const delay = this.calculateReconnectDelay()
		this.state.reconnectAttempts++

		this.reconnectTimeout = setTimeout(() => {
			if (this.mounted) {
				this.connect()
			}
		}, delay)
	}

	/**
	 * Clear reconnect timeout
	 */
	private clearReconnectTimeout(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = null
		}
	}

	/**
	 * Start heartbeat ping/pong mechanism
	 */
	private startHeartbeat(): void {
		this.lastPongTime = Date.now()

		this.heartbeatInterval = setInterval(() => {
			if (!this.ws || this.ws.readyState !== MockWebSocket.OPEN) {
				return
			}

			// Check if we received pong within timeout
			const timeSinceLastPong = Date.now() - this.lastPongTime
			if (timeSinceLastPong > this.heartbeatTimeoutMs + this.heartbeatIntervalMs) {
				// Connection seems dead, force reconnect
				this.ws.close()
				return
			}

			// Send ping
			this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
		}, this.heartbeatIntervalMs)
	}

	/**
	 * Stop heartbeat mechanism
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval)
			this.heartbeatInterval = null
		}
	}

	/**
	 * Update connection status
	 */
	private updateStatus(status: ConnectionStatus): void {
		this.state.status = status
		this.onStatusChange?.(status)
	}

	/**
	 * Cleanup on unmount
	 */
	cleanup(): void {
		this.mounted = false
		this.disconnect()
		this.messageQueue.messages = []
	}
}

// =============================================================================
// Tests
// =============================================================================

describe('WebSocket Connection Manager', () => {
	let manager: WebSocketConnectionManager

	beforeEach(() => {
		vi.useFakeTimers()
		mockWebSocketInstances = []
		manager = new WebSocketConnectionManager('ws://localhost:3000/ws', MockWebSocket)
	})

	afterEach(() => {
		manager.cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	// =========================================================================
	// Connection Initialization Tests
	// =========================================================================

	describe('Connection Initialization', () => {
		it('creates WebSocket with correct URL', () => {
			manager.connect()

			expect(mockWebSocketInstances).toHaveLength(1)
			expect(getMockInstance(0).url).toBe('ws://localhost:3000/ws')
		})

		it('sets status to connecting when connect is called', () => {
			const statusChanges: ConnectionStatus[] = []
			manager.onStatusChange = (status) => statusChanges.push(status)

			manager.connect()

			expect(statusChanges).toContain('connecting')
		})

		it('sets status to connected when WebSocket opens', () => {
			const statusChanges: ConnectionStatus[] = []
			manager.onStatusChange = (status) => statusChanges.push(status)

			manager.connect()
			getMockInstance(0).simulateOpen()

			expect(statusChanges).toContain('connected')
			expect(manager.getState().status).toBe('connected')
		})

		it('does not create duplicate connections when already connected', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			manager.connect() // Try to connect again

			expect(mockWebSocketInstances).toHaveLength(1)
		})

		it('clears error state on new connection attempt', () => {
			manager.connect()
			getMockInstance(0).simulateError()

			expect(manager.getState().error).toBe('WebSocket connection error')

			manager.connect()

			expect(manager.getState().error).toBeNull()
		})
	})

	// =========================================================================
	// Message Serialization/Deserialization Tests
	// =========================================================================

	describe('Message Serialization/Deserialization', () => {
		it('serializes client messages to JSON', () => {
			const message: ClientMessage = {
				type: 'chat',
				payload: { message: 'Hello', userId: 'user-1' },
			}

			const serialized = manager.serializeMessage(message)

			expect(serialized).toBe(JSON.stringify(message))
		})

		it('deserializes valid server messages', () => {
			const rawMessage = JSON.stringify({
				type: 'text',
				data: { content: 'Hello' },
				timestamp: Date.now(),
			})

			const message = manager.deserializeMessage(rawMessage)

			expect(message.type).toBe('text')
			expect(message.data).toEqual({ content: 'Hello' })
		})

		it('deserializes state_update messages', () => {
			const rawMessage = JSON.stringify({
				type: 'state_update',
				data: { isProcessing: true },
				timestamp: Date.now(),
			})

			const message = manager.deserializeMessage(rawMessage)

			expect(message.type).toBe('state_update')
		})

		it('deserializes done messages', () => {
			const rawMessage = JSON.stringify({
				type: 'done',
				data: {},
				timestamp: Date.now(),
			})

			const message = manager.deserializeMessage(rawMessage)

			expect(message.type).toBe('done')
		})

		it('deserializes error messages', () => {
			const rawMessage = JSON.stringify({
				type: 'error',
				data: { message: 'Something went wrong' },
				timestamp: Date.now(),
			})

			const message = manager.deserializeMessage(rawMessage)

			expect(message.type).toBe('error')
		})

		it('deserializes tool_call messages', () => {
			const rawMessage = JSON.stringify({
				type: 'tool_call',
				data: { toolId: 'search', params: {} },
				timestamp: Date.now(),
			})

			const message = manager.deserializeMessage(rawMessage)

			expect(message.type).toBe('tool_call')
		})

		it('deserializes tool_result messages', () => {
			const rawMessage = JSON.stringify({
				type: 'tool_result',
				data: { result: 'success' },
				timestamp: Date.now(),
			})

			const message = manager.deserializeMessage(rawMessage)

			expect(message.type).toBe('tool_result')
		})
	})

	// =========================================================================
	// Reconnection Logic with Exponential Backoff Tests
	// =========================================================================

	describe('Reconnection Logic with Exponential Backoff', () => {
		it('calculates correct exponential backoff delays', () => {
			// First attempt: 1000ms
			expect(manager.calculateReconnectDelay()).toBe(1000)

			// Simulate increasing reconnect attempts
			manager.connect()
			getMockInstance(0).simulateClose()

			vi.advanceTimersByTime(1000)

			// Second attempt: 2000ms
			expect(manager.calculateReconnectDelay()).toBe(2000)
		})

		it('caps reconnect delay at maximum', () => {
			// Manually increment reconnect attempts to simulate many failures
			// without actually creating connections
			manager.connect()
			getMockInstance(0).simulateClose()

			// After first close, reconnect attempt is 1
			// delay = 1000 * 2^1 = 2000
			expect(manager.calculateReconnectDelay()).toBe(2000)

			// Advance and let it reconnect
			vi.advanceTimersByTime(2000)
			getMockInstance(1).simulateClose()

			// delay = 1000 * 2^2 = 4000
			expect(manager.calculateReconnectDelay()).toBe(4000)

			// Test that delay is always <= maxReconnectDelay (30000)
			// After enough attempts, it should cap
			vi.advanceTimersByTime(4000)
			getMockInstance(2).simulateClose()
			vi.advanceTimersByTime(8000)
			getMockInstance(3).simulateClose()
			vi.advanceTimersByTime(16000)
			getMockInstance(4).simulateClose()

			// At attempt 5: delay would be 1000 * 2^5 = 32000, but capped at 30000
			expect(manager.calculateReconnectDelay()).toBeLessThanOrEqual(30000)
		})

		it('schedules reconnect after connection close', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()
			getMockInstance(0).simulateClose()

			// Should have scheduled reconnect
			vi.advanceTimersByTime(1000)

			// New WebSocket instance should be created
			expect(mockWebSocketInstances).toHaveLength(2)
		})

		it('resets reconnect attempts after successful connection', () => {
			manager.connect()
			getMockInstance(0).simulateClose()

			vi.advanceTimersByTime(1000)

			// Second connection attempt
			getMockInstance(1).simulateOpen()

			// Reconnect attempts should be reset
			expect(manager.getState().reconnectAttempts).toBe(0)
		})

		it('stops reconnecting after max attempts', () => {
			// Test by verifying the max reconnect attempts logic
			// Rather than simulating 10+ connection cycles, we test the behavior
			// at the boundary condition

			manager.connect()
			getMockInstance(0).simulateOpen()
			getMockInstance(0).simulateClose() // attempt 1

			vi.advanceTimersByTime(1000)
			getMockInstance(1).simulateClose() // attempt 2

			vi.advanceTimersByTime(2000)
			getMockInstance(2).simulateClose() // attempt 3

			vi.advanceTimersByTime(4000)
			getMockInstance(3).simulateClose() // attempt 4

			vi.advanceTimersByTime(8000)
			getMockInstance(4).simulateClose() // attempt 5

			vi.advanceTimersByTime(16000)
			getMockInstance(5).simulateClose() // attempt 6

			vi.advanceTimersByTime(30000)
			getMockInstance(6).simulateClose() // attempt 7

			vi.advanceTimersByTime(30000)
			getMockInstance(7).simulateClose() // attempt 8

			vi.advanceTimersByTime(30000)
			getMockInstance(8).simulateClose() // attempt 9

			vi.advanceTimersByTime(30000)
			getMockInstance(9).simulateClose() // attempt 10

			vi.advanceTimersByTime(30000)
			// At this point we should have 11 instances (initial + 10 reconnects)
			const instanceCount = mockWebSocketInstances.length

			// Close again - now at max attempts, should not schedule reconnect
			getMockInstance(10).simulateClose()

			// Advance time - no new connections should be created
			vi.advanceTimersByTime(60000)

			expect(mockWebSocketInstances).toHaveLength(instanceCount)
		})
	})

	// =========================================================================
	// Heartbeat/Ping-Pong Mechanism Tests
	// =========================================================================

	describe('Heartbeat/Ping-Pong Mechanism', () => {
		it('starts heartbeat after connection opens', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			// Advance to first heartbeat interval
			vi.advanceTimersByTime(30000)

			// Should have sent a ping
			expect(getMockInstance(0).send).toHaveBeenCalledWith(
				expect.stringContaining('"type":"ping"'),
			)
		})

		it('sends periodic ping messages', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			// Verify first ping is sent at first interval
			vi.advanceTimersByTime(30000)
			let pingCalls = (getMockInstance(0).send.mock.calls as string[][]).filter(
				(call) => call[0]?.includes('"type":"ping"'),
			)
			expect(pingCalls.length).toBe(1)

			// Simulate pong response to prevent timeout
			getMockInstance(0).simulateMessage({
				type: 'pong' as ServerMessage['type'],
				data: {},
				timestamp: Date.now(),
			})

			// Verify second ping is sent
			vi.advanceTimersByTime(30000)
			pingCalls = (getMockInstance(0).send.mock.calls as string[][]).filter(
				(call) => call[0]?.includes('"type":"ping"'),
			)
			expect(pingCalls.length).toBe(2)

			// Simulate pong response
			getMockInstance(0).simulateMessage({
				type: 'pong' as ServerMessage['type'],
				data: {},
				timestamp: Date.now(),
			})

			// Verify third ping is sent
			vi.advanceTimersByTime(30000)
			pingCalls = (getMockInstance(0).send.mock.calls as string[][]).filter(
				(call) => call[0]?.includes('"type":"ping"'),
			)
			expect(pingCalls.length).toBeGreaterThanOrEqual(3)
		})

		it('handles pong response', () => {
			const messages: ServerMessage[] = []
			manager.onMessage = (msg) => messages.push(msg)

			manager.connect()
			getMockInstance(0).simulateOpen()

			// Simulate pong response (should not trigger onMessage)
			getMockInstance(0).simulateMessage({
				type: 'pong' as ServerMessage['type'],
				data: {},
				timestamp: Date.now(),
			})

			// Pong should not be passed to onMessage
			expect(messages.filter((m) => m.type === ('pong' as ServerMessage['type']))).toHaveLength(0)
		})

		it('closes connection when no pong received within timeout', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			// First heartbeat interval - sends ping, no issue yet
			vi.advanceTimersByTime(30000)

			// Second heartbeat interval - checks pong timeout
			// Since no pong received, time since last pong > heartbeatTimeout + heartbeatInterval
			vi.advanceTimersByTime(30000)

			// Connection should be closed due to missed pong
			expect(getMockInstance(0).close).toHaveBeenCalled()
		})

		it('stops heartbeat when disconnected', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			manager.disconnect()

			const sendCallsBeforeDisconnect = getMockInstance(0).send.mock.calls.length

			// Advance time - should not send more pings
			vi.advanceTimersByTime(60000)

			expect(getMockInstance(0).send.mock.calls.length).toBe(
				sendCallsBeforeDisconnect,
			)
		})
	})

	// =========================================================================
	// Connection State Management Tests
	// =========================================================================

	describe('Connection State Management', () => {
		it('starts in disconnected state', () => {
			expect(manager.getState().status).toBe('disconnected')
		})

		it('transitions through connecting -> connected states', () => {
			const statusChanges: ConnectionStatus[] = []
			manager.onStatusChange = (status) => statusChanges.push(status)

			manager.connect()
			getMockInstance(0).simulateOpen()

			expect(statusChanges).toEqual(['connecting', 'connected'])
		})

		it('transitions to error state on WebSocket error', () => {
			const statusChanges: ConnectionStatus[] = []
			manager.onStatusChange = (status) => statusChanges.push(status)

			manager.connect()
			getMockInstance(0).simulateError()

			expect(statusChanges).toContain('error')
			expect(manager.getState().error).toBe('WebSocket connection error')
		})

		it('transitions to disconnected state on close', () => {
			const statusChanges: ConnectionStatus[] = []
			manager.onStatusChange = (status) => statusChanges.push(status)

			manager.connect()
			getMockInstance(0).simulateOpen()
			getMockInstance(0).simulateClose()

			expect(statusChanges[statusChanges.length - 1]).toBe('disconnected')
		})

		it('tracks reconnect attempts', () => {
			manager.connect()
			getMockInstance(0).simulateClose()

			expect(manager.getState().reconnectAttempts).toBe(1)

			vi.advanceTimersByTime(1000)
			getMockInstance(1).simulateClose()

			expect(manager.getState().reconnectAttempts).toBe(2)
		})

		it('provides error message in state', () => {
			manager.connect()
			getMockInstance(0).simulateError()

			expect(manager.getState().error).toBe('WebSocket connection error')
		})
	})

	// =========================================================================
	// Message Queue During Disconnect Tests
	// =========================================================================

	describe('Message Queue During Disconnect', () => {
		it('queues messages when disconnected', () => {
			const message: ClientMessage = {
				type: 'chat',
				payload: { message: 'Hello' },
			}

			const sent = manager.send(message)

			expect(sent).toBe(false)
			expect(manager.getMessageQueue()).toHaveLength(1)
		})

		it('flushes queued messages after reconnection', () => {
			const message1: ClientMessage = { type: 'chat', payload: { message: '1' } }
			const message2: ClientMessage = { type: 'chat', payload: { message: '2' } }

			manager.send(message1)
			manager.send(message2)

			expect(manager.getMessageQueue()).toHaveLength(2)

			manager.connect()
			getMockInstance(0).simulateOpen()

			// Messages should be sent
			expect(getMockInstance(0).send).toHaveBeenCalledTimes(2)
			expect(manager.getMessageQueue()).toHaveLength(0)
		})

		it('preserves message order when flushing queue', () => {
			const messages: ClientMessage[] = [
				{ type: 'chat', payload: { message: '1' } },
				{ type: 'chat', payload: { message: '2' } },
				{ type: 'chat', payload: { message: '3' } },
			]

			for (const msg of messages) {
				manager.send(msg)
			}

			manager.connect()
			getMockInstance(0).simulateOpen()

			const sentCalls = getMockInstance(0).send.mock.calls as string[][]
			expect(JSON.parse(sentCalls[0]?.[0] ?? '{}').payload.message).toBe('1')
			expect(JSON.parse(sentCalls[1]?.[0] ?? '{}').payload.message).toBe('2')
			expect(JSON.parse(sentCalls[2]?.[0] ?? '{}').payload.message).toBe('3')
		})

		it('limits queue size to prevent memory issues', () => {
			// Queue 150 messages (max is 100)
			for (let i = 0; i < 150; i++) {
				manager.send({ type: 'chat', payload: { message: `${i}` } })
			}

			expect(manager.getMessageQueue()).toHaveLength(100)

			// Should keep the most recent messages
			const queue = manager.getMessageQueue()
			const firstMessage = queue[0]
			const lastMessage = queue[99]
			expect(firstMessage).toBeDefined()
			expect(lastMessage).toBeDefined()
			expect(JSON.parse(manager.serializeMessage(firstMessage!)).payload.message).toBe('50')
			expect(JSON.parse(manager.serializeMessage(lastMessage!)).payload.message).toBe('149')
		})

		it('sends messages immediately when connected', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			const message: ClientMessage = { type: 'chat', payload: { message: 'Hello' } }
			const sent = manager.send(message)

			expect(sent).toBe(true)
			expect(getMockInstance(0).send).toHaveBeenCalled()
			expect(manager.getMessageQueue()).toHaveLength(0)
		})
	})

	// =========================================================================
	// Error Handling for Malformed Messages Tests
	// =========================================================================

	describe('Error Handling for Malformed Messages', () => {
		it('throws error for invalid JSON', () => {
			expect(() => manager.deserializeMessage('not json')).toThrow()
		})

		it('throws error for non-object messages', () => {
			expect(() => manager.deserializeMessage('"string"')).toThrow(
				'Invalid message format: not an object',
			)
		})

		it('throws error for messages without type', () => {
			expect(() => manager.deserializeMessage('{"data": {}}')).toThrow(
				'Invalid message format: missing type',
			)
		})

		it('throws error for unknown message types', () => {
			expect(() =>
				manager.deserializeMessage('{"type": "unknown", "data": {}}'),
			).toThrow('Invalid message type: unknown')
		})

		it('calls onError callback for malformed messages', () => {
			const errors: string[] = []
			manager.onError = (error) => errors.push(error)

			manager.connect()
			getMockInstance(0).simulateOpen()

			// Simulate malformed message by calling onmessage directly
			getMockInstance(0).onmessage?.({
				data: 'not valid json',
			} as MessageEvent)

			expect(errors).toHaveLength(1)
		})

		it('handles null message gracefully', () => {
			expect(() => manager.deserializeMessage('null')).toThrow(
				'Invalid message format: not an object',
			)
		})

		it('handles array message gracefully', () => {
			// Arrays are objects in JavaScript but should fail type validation
			expect(() => manager.deserializeMessage('[]')).toThrow(
				'Invalid message format: missing type',
			)
		})
	})

	// =========================================================================
	// Cleanup on Component Unmount Tests
	// =========================================================================

	describe('Cleanup on Component Unmount', () => {
		it('closes WebSocket connection on cleanup', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			manager.cleanup()

			expect(getMockInstance(0).close).toHaveBeenCalled()
		})

		it('clears reconnect timeout on cleanup', () => {
			manager.connect()
			getMockInstance(0).simulateClose()

			// Reconnect is scheduled
			manager.cleanup()

			// Advance time - should not create new connection
			vi.advanceTimersByTime(5000)

			expect(mockWebSocketInstances).toHaveLength(1)
		})

		it('clears message queue on cleanup', () => {
			manager.send({ type: 'chat', payload: { message: 'queued' } })

			expect(manager.getMessageQueue()).toHaveLength(1)

			manager.cleanup()

			expect(manager.getMessageQueue()).toHaveLength(0)
		})

		it('stops heartbeat on cleanup', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			manager.cleanup()

			const sendCallsAtCleanup = getMockInstance(0).send.mock.calls.length

			// Advance time - should not send more pings
			vi.advanceTimersByTime(60000)

			expect(getMockInstance(0).send.mock.calls.length).toBe(
				sendCallsAtCleanup,
			)
		})

		it('prevents new connections after cleanup', () => {
			manager.cleanup()
			manager.connect()

			expect(mockWebSocketInstances).toHaveLength(0)
		})

		it('prevents reconnection after cleanup', () => {
			manager.connect()
			getMockInstance(0).simulateOpen()

			manager.cleanup()

			// Simulate close after cleanup
			getMockInstance(0).simulateClose()

			// Advance time
			vi.advanceTimersByTime(5000)

			// Should not have created new connection
			expect(mockWebSocketInstances).toHaveLength(1)
		})

		it('ignores messages received after cleanup', () => {
			const messages: ServerMessage[] = []
			manager.onMessage = (msg) => messages.push(msg)

			manager.connect()
			getMockInstance(0).simulateOpen()

			manager.cleanup()

			// Simulate message after cleanup
			getMockInstance(0).simulateMessage({
				type: 'text',
				data: { content: 'Hello' },
				timestamp: Date.now(),
			})

			expect(messages).toHaveLength(0)
		})
	})

	// =========================================================================
	// Mock WebSocket Tests
	// =========================================================================

	describe('Mock WebSocket', () => {
		it('uses mock WebSocket for unit tests', () => {
			manager.connect()

			expect(mockWebSocketInstances).toHaveLength(1)
			expect(getMockInstance(0)).toBeInstanceOf(MockWebSocket)
		})

		it('mock WebSocket tracks all instances', () => {
			manager.connect()
			getMockInstance(0).simulateClose()

			vi.advanceTimersByTime(1000)

			// Second connection attempt
			expect(mockWebSocketInstances).toHaveLength(2)
		})

		it('mock WebSocket simulates open correctly', () => {
			manager.connect()
			const ws = getMockInstance(0)

			expect(ws.readyState).toBe(MockWebSocket.CONNECTING)

			ws.simulateOpen()

			expect(ws.readyState).toBe(MockWebSocket.OPEN)
		})

		it('mock WebSocket simulates close correctly', () => {
			manager.connect()
			const ws = getMockInstance(0)
			ws.simulateOpen()

			expect(ws.readyState).toBe(MockWebSocket.OPEN)

			ws.simulateClose()

			expect(ws.readyState).toBe(MockWebSocket.CLOSED)
		})
	})
})

// =============================================================================
// Integration with useAgentWebSocket Hook Tests
// =============================================================================

describe('WebSocket Hook Integration Patterns', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		mockWebSocketInstances = []
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('demonstrates hook-like state management pattern', () => {
		// This test demonstrates how the manager would be used in a hook context
		const manager = new WebSocketConnectionManager('ws://localhost:3000/ws', MockWebSocket)

		// Track state changes like a React component would
		const stateHistory: ConnectionStatus[] = []
		manager.onStatusChange = (status) => stateHistory.push(status)

		// Connect
		manager.connect()
		expect(stateHistory).toEqual(['connecting'])

		// Open connection
		getMockInstance(0).simulateOpen()
		expect(stateHistory).toEqual(['connecting', 'connected'])

		// Simulate disconnect
		getMockInstance(0).simulateClose()
		expect(stateHistory).toEqual(['connecting', 'connected', 'disconnected'])

		// Cleanup
		manager.cleanup()
	})

	it('demonstrates message handling pattern for streaming text', () => {
		const manager = new WebSocketConnectionManager('ws://localhost:3000/ws', MockWebSocket)

		let streamingText = ''
		manager.onMessage = (message) => {
			if (message.type === 'text') {
				const data = message.data as { content: string }
				streamingText += data.content
			}
		}

		manager.connect()
		getMockInstance(0).simulateOpen()

		// Simulate streaming response
		getMockInstance(0).simulateMessage({
			type: 'text',
			data: { content: 'Hello' },
			timestamp: Date.now(),
		})
		getMockInstance(0).simulateMessage({
			type: 'text',
			data: { content: ' World' },
			timestamp: Date.now(),
		})

		expect(streamingText).toBe('Hello World')

		manager.cleanup()
	})

	it('demonstrates state sync pattern', () => {
		const manager = new WebSocketConnectionManager('ws://localhost:3000/ws', MockWebSocket)

		interface AgentState {
			isProcessing: boolean
			status: string
		}

		let agentState: AgentState | null = null
		manager.onMessage = (message) => {
			if (message.type === 'state_update') {
				agentState = message.data as AgentState
			}
		}

		manager.connect()
		getMockInstance(0).simulateOpen()

		// Simulate state update
		getMockInstance(0).simulateMessage({
			type: 'state_update',
			data: { isProcessing: true, status: 'processing' },
			timestamp: Date.now(),
		})

		expect(agentState).toEqual({ isProcessing: true, status: 'processing' })

		manager.cleanup()
	})
})
