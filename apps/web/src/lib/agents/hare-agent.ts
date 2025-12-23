/**
 * HareAgent - Cloudflare Agents SDK Implementation
 *
 * A stateful AI agent built on Cloudflare's Agents SDK with:
 * - Durable Object-backed state persistence
 * - WebSocket support with hibernation
 * - Real-time state synchronization
 * - Scheduling and alarms
 * - Tool execution
 */

import { Agent, type Connection, type ConnectionContext, type WSMessage } from 'agents'
import type { CoreMessage } from 'ai'
import { streamText } from 'ai'
import { createWorkersAIModel } from './providers/workers-ai'
import { getSystemTools, type Tool, type ToolContext, type ToolResult } from './tools'

/**
 * Agent state that is persisted and synced with clients.
 */
export interface HareAgentState {
	/** Agent configuration ID from database */
	agentId: string
	/** Workspace ID */
	workspaceId: string
	/** Agent name */
	name: string
	/** Agent instructions/system prompt */
	instructions: string
	/** Model to use */
	model: string
	/** Conversation history */
	messages: CoreMessage[]
	/** Whether the agent is currently processing */
	isProcessing: boolean
	/** Last activity timestamp */
	lastActivity: number
	/** Connected user IDs */
	connectedUsers: string[]
	/** Scheduled tasks */
	scheduledTasks: ScheduledTask[]
	/** Agent status */
	status: 'idle' | 'processing' | 'error'
	/** Last error if any */
	lastError?: string
}

/**
 * Scheduled task definition.
 */
export interface ScheduledTask {
	id: string
	type: 'one-time' | 'recurring'
	executeAt?: number
	cron?: string
	action: string
	payload?: Record<string, unknown>
}

/**
 * Message sent from client to agent.
 */
export interface ClientMessage {
	type: 'chat' | 'configure' | 'execute_tool' | 'get_state' | 'schedule'
	payload: unknown
}

/**
 * Chat message payload.
 */
export interface ChatPayload {
	message: string
	userId: string
	sessionId?: string
	metadata?: Record<string, unknown>
}

/**
 * Tool execution payload.
 */
export interface ToolExecutePayload {
	toolId: string
	params: Record<string, unknown>
}

/**
 * Schedule payload.
 */
export interface SchedulePayload {
	action: string
	executeAt?: number
	cron?: string
	payload?: Record<string, unknown>
}

/**
 * Server message sent to clients.
 */
export interface ServerMessage {
	type: 'text' | 'tool_call' | 'tool_result' | 'state_update' | 'error' | 'done'
	data: unknown
	timestamp: number
}

/**
 * Default initial state.
 */
const DEFAULT_STATE: HareAgentState = {
	agentId: '',
	workspaceId: '',
	name: 'Hare Agent',
	instructions: 'You are a helpful AI assistant.',
	model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	messages: [],
	isProcessing: false,
	lastActivity: Date.now(),
	connectedUsers: [],
	scheduledTasks: [],
	status: 'idle',
}

/**
 * HareAgent - A Cloudflare Agents SDK implementation.
 *
 * This class extends the Agent base class to provide:
 * - Stateful conversations with persistence
 * - Real-time WebSocket communication
 * - Tool execution
 * - Scheduled tasks
 */
export class HareAgent extends Agent<CloudflareEnv, HareAgentState> {
	// Tools available to this agent
	private tools: Map<string, Tool> = new Map()

	/**
	 * Initialize the agent with default state.
	 */
	override initialState: HareAgentState = DEFAULT_STATE

	/**
	 * Called when the agent is created or loaded.
	 */
	async onStart(): Promise<void> {
		// Load system tools
		const context = this.createToolContext()
		const systemTools = getSystemTools(context)
		for (const tool of systemTools) {
			this.tools.set(tool.id, tool)
		}
	}

	/**
	 * Handle HTTP requests to the agent.
	 */
	async onRequest(request: Request): Promise<Response> {
		const url = new URL(request.url)

		// Health check
		if (url.pathname === '/health') {
			return Response.json({ status: 'ok', agentId: this.state.agentId })
		}

		// Get current state
		if (url.pathname === '/state' && request.method === 'GET') {
			return Response.json(this.state)
		}

		// Configure agent
		if (url.pathname === '/configure' && request.method === 'POST') {
			const config = (await request.json()) as Partial<HareAgentState>
			await this.configure(config)
			return Response.json({ success: true, state: this.state })
		}

		// Chat via HTTP (for non-WebSocket clients)
		if (url.pathname === '/chat' && request.method === 'POST') {
			const payload = (await request.json()) as ChatPayload
			const response = await this.handleChatHTTP(payload)
			return response
		}

		// List scheduled tasks
		if (url.pathname === '/schedules' && request.method === 'GET') {
			const schedules = await this.getSchedules()
			return Response.json({ schedules })
		}

		return new Response('Not found', { status: 404 })
	}

	/**
	 * Handle new WebSocket connection.
	 */
	async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
		const userId = ctx.request.headers.get('x-user-id') || 'anonymous'

		// Add user to connected users
		this.setState({
			...this.state,
			connectedUsers: [...this.state.connectedUsers.filter((id) => id !== userId), userId],
			lastActivity: Date.now(),
		})

		// Send current state to the new connection
		this.sendToConnection(connection, {
			type: 'state_update',
			data: this.state,
			timestamp: Date.now(),
		})
	}

	/**
	 * Handle WebSocket message from client.
	 */
	async onMessage(connection: Connection, message: WSMessage): Promise<void> {
		try {
			const data = typeof message === 'string' ? JSON.parse(message) : message
			const clientMessage = data as ClientMessage

			switch (clientMessage.type) {
				case 'chat':
					await this.handleChat(connection, clientMessage.payload as ChatPayload)
					break

				case 'configure':
					await this.configure(clientMessage.payload as Partial<HareAgentState>)
					break

				case 'execute_tool':
					await this.handleToolExecution(connection, clientMessage.payload as ToolExecutePayload)
					break

				case 'get_state':
					this.sendToConnection(connection, {
						type: 'state_update',
						data: this.state,
						timestamp: Date.now(),
					})
					break

				case 'schedule':
					await this.handleSchedule(connection, clientMessage.payload as SchedulePayload)
					break

				default:
					this.sendError(connection, `Unknown message type: ${clientMessage.type}`)
			}
		} catch (error) {
			this.sendError(connection, error instanceof Error ? error.message : 'Unknown error')
		}
	}

	/**
	 * Handle WebSocket disconnection.
	 */
	async onClose(connection: Connection): Promise<void> {
		// Note: We can't easily get userId here, but state sync will clean up on next activity
		this.setState({
			...this.state,
			lastActivity: Date.now(),
		})
	}

	/**
	 * Called when state is updated (for custom logic).
	 */
	onStateUpdate(state: HareAgentState): void {
		// Broadcast state update to all connected clients
		this.broadcast({
			type: 'state_update',
			data: state,
			timestamp: Date.now(),
		})
	}

	/**
	 * Configure the agent with new settings.
	 */
	async configure(config: Partial<HareAgentState>): Promise<void> {
		this.setState({
			...this.state,
			...config,
			lastActivity: Date.now(),
		})
	}

	/**
	 * Handle chat message via WebSocket.
	 */
	private async handleChat(connection: Connection, payload: ChatPayload): Promise<void> {
		const { message, userId, metadata } = payload

		// Update state to processing
		this.setState({
			...this.state,
			isProcessing: true,
			status: 'processing',
			lastActivity: Date.now(),
		})

		try {
			// Add user message to history
			const userMessage: CoreMessage = { role: 'user', content: message }
			const messages = [...this.state.messages, userMessage]

			// Create AI model
			const model = createWorkersAIModel(this.state.model, this.env.AI)

			// Build system prompt
			const systemMessage: CoreMessage = {
				role: 'system',
				content: this.buildSystemPrompt(),
			}

			// Stream response
			const result = await streamText({
				model,
				messages: [systemMessage, ...messages],
			})

			let fullResponse = ''

			// Stream chunks to client
			for await (const chunk of result.textStream) {
				fullResponse += chunk
				this.sendToConnection(connection, {
					type: 'text',
					data: { content: chunk },
					timestamp: Date.now(),
				})
			}

			// Add assistant response to history
			const assistantMessage: CoreMessage = { role: 'assistant', content: fullResponse }

			// Update state with new messages
			this.setState({
				...this.state,
				messages: [...messages, assistantMessage],
				isProcessing: false,
				status: 'idle',
				lastActivity: Date.now(),
			})

			// Send done signal
			this.sendToConnection(connection, {
				type: 'done',
				data: {
					messageCount: this.state.messages.length,
					userId,
					metadata,
				},
				timestamp: Date.now(),
			})
		} catch (error) {
			this.setState({
				...this.state,
				isProcessing: false,
				status: 'error',
				lastError: error instanceof Error ? error.message : 'Unknown error',
				lastActivity: Date.now(),
			})
			this.sendError(connection, error instanceof Error ? error.message : 'Chat failed')
		}
	}

	/**
	 * Handle chat via HTTP (streaming response).
	 */
	private async handleChatHTTP(payload: ChatPayload): Promise<Response> {
		const { message, userId, metadata } = payload

		// Update state to processing
		this.setState({
			...this.state,
			isProcessing: true,
			status: 'processing',
			lastActivity: Date.now(),
		})

		try {
			// Add user message to history
			const userMessage: CoreMessage = { role: 'user', content: message }
			const messages = [...this.state.messages, userMessage]

			// Create AI model
			const model = createWorkersAIModel(this.state.model, this.env.AI)

			// Build system prompt
			const systemMessage: CoreMessage = {
				role: 'system',
				content: this.buildSystemPrompt(),
			}

			// Stream response
			const result = await streamText({
				model,
				messages: [systemMessage, ...messages],
			})

			// Create readable stream for SSE
			const encoder = new TextEncoder()
			let fullResponse = ''

			const stream = new ReadableStream({
				start: async (controller) => {
					try {
						for await (const chunk of result.textStream) {
							fullResponse += chunk
							const data = JSON.stringify({ type: 'text', content: chunk })
							controller.enqueue(encoder.encode(`data: ${data}\n\n`))
						}

						// Update state with response
						const assistantMessage: CoreMessage = { role: 'assistant', content: fullResponse }
						this.setState({
							...this.state,
							messages: [...messages, assistantMessage],
							isProcessing: false,
							status: 'idle',
							lastActivity: Date.now(),
						})

						// Send done
						const doneData = JSON.stringify({ type: 'done', userId, metadata })
						controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
						controller.close()
					} catch (error) {
						const errorData = JSON.stringify({
							type: 'error',
							message: error instanceof Error ? error.message : 'Unknown error',
						})
						controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
						controller.close()
					}
				},
			})

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
			})
		} catch (error) {
			this.setState({
				...this.state,
				isProcessing: false,
				status: 'error',
				lastError: error instanceof Error ? error.message : 'Unknown error',
				lastActivity: Date.now(),
			})

			return Response.json(
				{ error: error instanceof Error ? error.message : 'Chat failed' },
				{ status: 500 },
			)
		}
	}

	/**
	 * Handle tool execution request.
	 */
	private async handleToolExecution(
		connection: Connection,
		payload: ToolExecutePayload,
	): Promise<void> {
		const { toolId, params } = payload

		const tool = this.tools.get(toolId)
		if (!tool) {
			this.sendError(connection, `Tool not found: ${toolId}`)
			return
		}

		// Send tool call notification
		this.sendToConnection(connection, {
			type: 'tool_call',
			data: { toolId, params },
			timestamp: Date.now(),
		})

		try {
			const context = this.createToolContext()
			const result = await tool.execute(params, context)

			this.sendToConnection(connection, {
				type: 'tool_result',
				data: { toolId, result },
				timestamp: Date.now(),
			})
		} catch (error) {
			this.sendToConnection(connection, {
				type: 'tool_result',
				data: {
					toolId,
					result: {
						success: false,
						error: error instanceof Error ? error.message : 'Tool execution failed',
					} as ToolResult,
				},
				timestamp: Date.now(),
			})
		}
	}

	/**
	 * Handle schedule request.
	 */
	private async handleSchedule(connection: Connection, payload: SchedulePayload): Promise<void> {
		const { action, executeAt, cron, payload: taskPayload } = payload

		try {
			let scheduleId: string

			if (cron) {
				// Recurring schedule
				scheduleId = await this.schedule(cron, action, taskPayload)
			} else if (executeAt) {
				// One-time schedule
				const delay = executeAt - Date.now()
				if (delay <= 0) {
					this.sendError(connection, 'Schedule time must be in the future')
					return
				}
				scheduleId = await this.schedule(delay, action, taskPayload)
			} else {
				this.sendError(connection, 'Either executeAt or cron must be provided')
				return
			}

			// Track in state
			const task: ScheduledTask = {
				id: scheduleId,
				type: cron ? 'recurring' : 'one-time',
				executeAt,
				cron,
				action,
				payload: taskPayload,
			}

			this.setState({
				...this.state,
				scheduledTasks: [...this.state.scheduledTasks, task],
				lastActivity: Date.now(),
			})

			this.sendToConnection(connection, {
				type: 'state_update',
				data: { scheduled: scheduleId, task },
				timestamp: Date.now(),
			})
		} catch (error) {
			this.sendError(connection, error instanceof Error ? error.message : 'Scheduling failed')
		}
	}

	/**
	 * Scheduled task handlers.
	 * These methods are called when scheduled tasks execute.
	 */

	async sendReminder(data: { message: string; userId: string }): Promise<void> {
		// Broadcast reminder to all connected clients
		this.broadcast({
			type: 'text',
			data: { content: `🔔 Reminder: ${data.message}`, userId: data.userId },
			timestamp: Date.now(),
		})
	}

	async runMaintenance(data: Record<string, unknown>): Promise<void> {
		// Clean up old messages (keep last 100)
		if (this.state.messages.length > 100) {
			this.setState({
				...this.state,
				messages: this.state.messages.slice(-100),
				lastActivity: Date.now(),
			})
		}
	}

	/**
	 * Build system prompt including tool documentation.
	 */
	private buildSystemPrompt(): string {
		const parts: string[] = [this.state.instructions]

		if (this.tools.size > 0) {
			parts.push('\n\n## Available Tools\n')
			parts.push('You have access to the following tools:\n')

			for (const [id, tool] of this.tools) {
				parts.push(`- **${id}**: ${tool.description}`)
			}

			parts.push('\nTo use a tool, describe what you want to do and the system will execute it.')
		}

		return parts.join('\n')
	}

	/**
	 * Create tool execution context.
	 */
	private createToolContext(): ToolContext {
		return {
			env: this.env,
			workspaceId: this.state.workspaceId,
			userId: 'agent', // Tools executed by agent itself
		}
	}

	/**
	 * Send a message to a specific connection.
	 */
	private sendToConnection(connection: Connection, message: ServerMessage): void {
		connection.send(JSON.stringify(message))
	}

	/**
	 * Broadcast a message to all connected clients.
	 */
	private broadcast(message: ServerMessage): void {
		const data = JSON.stringify(message)
		// Use the connections from the Agent base class
		for (const connection of this.getConnections()) {
			connection.send(data)
		}
	}

	/**
	 * Send an error message to a connection.
	 */
	private sendError(connection: Connection, error: string): void {
		this.sendToConnection(connection, {
			type: 'error',
			data: { message: error },
			timestamp: Date.now(),
		})
	}
}

export default HareAgent
