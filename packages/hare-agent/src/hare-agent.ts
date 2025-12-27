/**
 * HareAgent - Cloudflare Agents SDK Implementation
 *
 * A stateful AI agent built on Cloudflare's Agents SDK with:
 * - Durable Object-backed state persistence
 * - WebSocket support with hibernation
 * - Real-time state synchronization
 * - Scheduling and alarms
 * - Tool execution
 *
 * NOTE: This file can only be imported in Cloudflare Workers context
 * because it uses the 'agents' package which depends on 'cloudflare:workers'.
 */

import { Agent, type Connection, type ConnectionContext, type WSMessage } from 'agents'
import type { CoreMessage } from 'ai'
import { streamText } from 'ai'
import { z } from 'zod'
import { type AnyTool, type HareEnv, type ToolContext, type ToolResult, getSystemTools } from '@hare/tools'
import { createWorkersAIModel } from './providers/workers-ai'
import {
	type ChatPayload,
	type ClientMessage,
	DEFAULT_HARE_AGENT_STATE,
	type HareAgentState,
	type ScheduledTask,
	type SchedulePayload,
	type ServerMessage,
	type ToolExecutePayload,
} from './types'

// Re-export types for convenience
export type { HareAgentState, ClientMessage, ServerMessage }

/**
 * Validation schemas for client messages.
 */
const ChatPayloadSchema = z.object({
	message: z.string().min(1, 'Message cannot be empty'),
	userId: z.string().min(1),
	sessionId: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

const ToolExecutePayloadSchema = z.object({
	toolId: z.string().min(1, 'Tool ID is required'),
	params: z.record(z.string(), z.unknown()),
})

const SchedulePayloadSchema = z.object({
	action: z.string().min(1, 'Action is required'),
	executeAt: z.number().positive().optional(),
	cron: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
})

const ConfigurePayloadSchema = z.object({
	agentId: z.string().min(1).optional(),
	workspaceId: z.string().min(1).optional(),
	name: z.string().min(1).optional(),
	instructions: z.string().optional(),
	model: z.string().min(1).optional(),
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant', 'system']),
				content: z.string(),
			}),
		)
		.optional(),
	isProcessing: z.boolean().optional(),
	lastActivity: z.number().positive().optional(),
	connectedUsers: z.array(z.string()).optional(),
	scheduledTasks: z
		.array(
			z.object({
				id: z.string(),
				type: z.enum(['one-time', 'recurring']),
				executeAt: z.number().optional(),
				cron: z.string().optional(),
				action: z.string(),
				payload: z.record(z.string(), z.unknown()).optional(),
			}),
		)
		.optional(),
	status: z.enum(['idle', 'processing', 'error']).optional(),
	lastError: z.string().optional(),
})

/**
 * Environment interface for HareAgent.
 * SDK users should extend this with their own bindings.
 */
export interface HareAgentEnv extends HareEnv {
	AI: Ai
}

/**
 * HareAgent - A Cloudflare Agents SDK implementation.
 *
 * This class extends the Agent base class to provide:
 * - Stateful conversations with persistence
 * - Real-time WebSocket communication
 * - Tool execution
 * - Scheduled tasks
 *
 * @example
 * ```ts
 * import { HareAgent } from '@hare/agent/workers'
 *
 * export { HareAgent }
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const id = env.HARE_AGENT.idFromName('default')
 *     return env.HARE_AGENT.get(id).fetch(request)
 *   }
 * }
 * ```
 */
export class HareAgent<TEnv extends HareAgentEnv = HareAgentEnv> extends Agent<
	TEnv,
	HareAgentState
> {
	// Tools available to this agent
	protected tools: Map<string, AnyTool> = new Map()

	// Track connection to userId mapping for cleanup
	private connectionUserMap: Map<Connection, string> = new Map()

	/**
	 * Initialize the agent with default state.
	 */
	override initialState: HareAgentState = DEFAULT_HARE_AGENT_STATE

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
			return Response.json({ schedules: this.state.scheduledTasks })
		}

		return new Response('Not found', { status: 404 })
	}

	/**
	 * Handle new WebSocket connection.
	 */
	async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
		const userId = ctx.request.headers.get('x-user-id') || 'anonymous'

		// Track this connection's userId for cleanup on disconnect
		this.connectionUserMap.set(connection, userId)

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
				case 'chat': {
					const parseResult = ChatPayloadSchema.safeParse(clientMessage.payload)
					if (!parseResult.success) {
						this.sendError(connection, `Invalid chat payload: ${parseResult.error.message}`)
						return
					}
					await this.handleChat(connection, parseResult.data)
					break
				}

				case 'configure': {
					const parseResult = ConfigurePayloadSchema.safeParse(clientMessage.payload)
					if (!parseResult.success) {
						this.sendError(connection, `Invalid configure payload: ${parseResult.error.message}`)
						return
					}
					await this.configure(parseResult.data)
					break
				}

				case 'execute_tool': {
					const parseResult = ToolExecutePayloadSchema.safeParse(clientMessage.payload)
					if (!parseResult.success) {
						this.sendError(
							connection,
							`Invalid tool execution payload: ${parseResult.error.message}`,
						)
						return
					}
					await this.handleToolExecution(connection, parseResult.data)
					break
				}

				case 'get_state':
					this.sendToConnection(connection, {
						type: 'state_update',
						data: this.state,
						timestamp: Date.now(),
					})
					break

				case 'schedule': {
					const parseResult = SchedulePayloadSchema.safeParse(clientMessage.payload)
					if (!parseResult.success) {
						this.sendError(connection, `Invalid schedule payload: ${parseResult.error.message}`)
						return
					}
					await this.handleSchedule(connection, parseResult.data)
					break
				}

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
		// Get the userId for this connection and remove from connected users
		const userId = this.connectionUserMap.get(connection)
		this.connectionUserMap.delete(connection)

		if (userId) {
			// Check if this user still has other connections
			const hasOtherConnections = Array.from(this.connectionUserMap.values()).includes(userId)

			if (!hasOtherConnections) {
				this.setState({
					...this.state,
					connectedUsers: this.state.connectedUsers.filter((id) => id !== userId),
					lastActivity: Date.now(),
				})
			} else {
				this.setState({
					...this.state,
					lastActivity: Date.now(),
				})
			}
		} else {
			this.setState({
				...this.state,
				lastActivity: Date.now(),
			})
		}
	}

	/**
	 * Called when state is updated (for custom logic).
	 */
	onStateUpdate(state: HareAgentState): void {
		// Broadcast state update to all connected clients
		this.broadcastMessage({
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
			const model = createWorkersAIModel({ modelName: this.state.model, ai: this.env.AI })

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
			const model = createWorkersAIModel({ modelName: this.state.model, ai: this.env.AI })

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
			// Include the action in the payload so the dispatcher can route it
			const schedulePayload = { action, ...taskPayload }
			let schedule: { id: string }

			if (cron) {
				// Recurring schedule - use executeScheduledTask as the callback
				schedule = await this.schedule(cron, 'executeScheduledTask', schedulePayload)
			} else if (executeAt) {
				// One-time schedule
				const delay = executeAt - Date.now()
				if (delay <= 0) {
					this.sendError(connection, 'Schedule time must be in the future')
					return
				}
				schedule = await this.schedule(delay, 'executeScheduledTask', schedulePayload)
			} else {
				this.sendError(connection, 'Either executeAt or cron must be provided')
				return
			}

			// Track in state
			const task: ScheduledTask = {
				id: schedule.id,
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
				data: { scheduled: schedule.id, task },
				timestamp: Date.now(),
			})
		} catch (error) {
			this.sendError(connection, error instanceof Error ? error.message : 'Scheduling failed')
		}
	}

	/**
	 * Dispatcher for scheduled tasks.
	 * Routes to the appropriate handler based on the action in the payload.
	 */
	async executeScheduledTask(data: { action: string; [key: string]: unknown }): Promise<void> {
		const { action, ...payload } = data

		switch (action) {
			case 'sendReminder':
				await this.sendReminder(payload as { message: string; userId: string })
				break
			case 'runMaintenance':
				await this.runMaintenance(payload as Record<string, unknown>)
				break
			default:
				console.warn(`Unknown scheduled action: ${action}`)
		}
	}

	/**
	 * Scheduled task handlers.
	 */

	async sendReminder(data: { message: string; userId: string }): Promise<void> {
		// Broadcast reminder to all connected clients
		this.broadcastMessage({
			type: 'text',
			data: { content: `Reminder: ${data.message}`, userId: data.userId },
			timestamp: Date.now(),
		})
	}

	async runMaintenance(_data: Record<string, unknown>): Promise<void> {
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
	protected createToolContext(): ToolContext {
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
	private broadcastMessage(message: ServerMessage): void {
		const data = JSON.stringify(message)
		for (const connection of this.connectionUserMap.keys()) {
			try {
				connection.send(data)
			} catch {
				// Connection may have closed, will be cleaned up in onClose
			}
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
