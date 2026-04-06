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

import {
	getSystemTools,
	type HareEnv,
	type ToolContext,
	ToolRegistry,
	type ToolResult,
} from '@hare/tools'
import {
	type ChatPayload,
	type ClientMessage,
	DEFAULT_HARE_AGENT_STATE,
	type HareAgentState,
	type ScheduledTask,
	type SchedulePayload,
	type ServerMessage,
	type ToolExecutePayload,
} from '@hare/types'
import { Agent, type Connection, type ConnectionContext, type WSMessage } from 'agents'
import type { ModelMessage, ToolSet } from 'ai'
import { stepCountIs, streamText } from 'ai'
import { z } from 'zod'
import { createWorkersAIModel } from './providers/workers-ai'
import { toAISDKTools } from './tool-adapter'

// Re-export types for convenience
export type { HareAgentState, ClientMessage, ServerMessage }

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of recent messages sent as context for inference */
const AGENT_CONTEXT_MESSAGE_LIMIT = 50
/** Threshold at which old messages are pruned during maintenance */
const AGENT_MAX_STORED_MESSAGES = 100

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
	systemToolsEnabled: z.boolean().optional(),
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
	AI_GATEWAY_ID?: string
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
	protected toolRegistry: ToolRegistry = new ToolRegistry()

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
		// Load system tools only if enabled
		this.reloadTools()
	}

	/**
	 * Reload tools based on current state.
	 * Called on startup and when systemToolsEnabled changes.
	 */
	private reloadTools(): void {
		// Clear existing tools
		this.toolRegistry = new ToolRegistry()

		// Load system tools only if enabled
		if (this.state.systemToolsEnabled) {
			const context = this.createToolContext()
			const systemTools = getSystemTools(context)
			this.toolRegistry.registerAll(systemTools)
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

		// Schedule a task via HTTP
		if (url.pathname === '/schedule' && request.method === 'POST') {
			const rawPayload = await request.json()
			const parseResult = SchedulePayloadSchema.safeParse(rawPayload)
			if (!parseResult.success) {
				return Response.json(
					{ error: `Invalid schedule payload: ${parseResult.error.message}` },
					{ status: 400 },
				)
			}
			return this.handleScheduleHTTP(parseResult.data)
		}

		// Execute a tool via HTTP
		if (url.pathname === '/execute-tool' && request.method === 'POST') {
			const rawPayload = await request.json()
			const parseResult = ToolExecutePayloadSchema.safeParse(rawPayload)
			if (!parseResult.success) {
				return Response.json(
					{ error: `Invalid tool execution payload: ${parseResult.error.message}` },
					{ status: 400 },
				)
			}
			return this.handleToolExecuteHTTP(parseResult.data)
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
		const systemToolsChanged =
			config.systemToolsEnabled !== undefined &&
			config.systemToolsEnabled !== this.state.systemToolsEnabled

		this.setState({
			...this.state,
			...config,
			lastActivity: Date.now(),
		})

		// Reload tools if systemToolsEnabled changed
		if (systemToolsChanged) {
			this.reloadTools()
		}
	}

	/**
	 * Handle chat message via WebSocket.
	 */
	/**
	 * Prepare inference options shared by both WebSocket and HTTP chat paths.
	 */
	private prepareInference(messages: ModelMessage[]) {
		// Route through AI Gateway if configured
		const gatewayId = this.env.AI_GATEWAY_ID
		const model = createWorkersAIModel({
			modelName: this.state.model,
			ai: this.env.AI,
			...(gatewayId ? { gateway: { id: gatewayId } } : {}),
		})
		const systemMessage: ModelMessage = {
			role: 'system',
			content: this.buildSystemPrompt(),
		}

		// Cap message history to avoid context overflow
		const recentMessages = messages.slice(-AGENT_CONTEXT_MESSAGE_LIMIT)

		// Convert Hare tools to AI SDK format for tool calling
		const context = this.createToolContext()
		const tools = this.toolRegistry.list()
		const aiTools: ToolSet =
			tools.length > 0
				? // biome-ignore lint/suspicious/noExplicitAny: Required for heterogeneous tool cast
					toAISDKTools(tools as any, context)
				: {}

		return {
			model,
			messages: [systemMessage, ...recentMessages],
			tools: aiTools,
			stopWhen: tools.length > 0 ? stepCountIs(5) : undefined,
			onStepFinish: (step: { toolCalls?: unknown[]; usage?: { totalTokens?: number } }) => {
				// Structured logging for observability
				if (step.toolCalls && Array.isArray(step.toolCalls) && step.toolCalls.length > 0) {
					console.log(
						JSON.stringify({
							type: 'tool_call',
							agentId: this.state.agentId,
							model: this.state.model,
							toolCount: step.toolCalls.length,
							tokens: step.usage?.totalTokens,
							gateway: gatewayId ?? 'direct',
						}),
					)
				}
			},
		}
	}

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
			const userMessage: ModelMessage = { role: 'user', content: message }
			const messages = [...this.state.messages, userMessage]

			// Stream response with tools
			const inference = this.prepareInference(messages)
			const result = await streamText(inference)

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
			const assistantMessage: ModelMessage = { role: 'assistant', content: fullResponse }

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
			const userMessage: ModelMessage = { role: 'user', content: message }
			const messages = [...this.state.messages, userMessage]

			// Stream response with tools
			const inference = this.prepareInference(messages)
			const result = await streamText(inference)

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
						const assistantMessage: ModelMessage = { role: 'assistant', content: fullResponse }
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
	 * Handle schedule via HTTP.
	 */
	private async handleScheduleHTTP(payload: SchedulePayload): Promise<Response> {
		const { action, executeAt, cron, payload: taskPayload } = payload

		try {
			// Include the action in the payload so the dispatcher can route it
			const schedulePayload = { action, ...taskPayload }
			let schedule: { id: string }

			if (cron) {
				// Recurring schedule
				schedule = await this.schedule(cron, 'executeScheduledTask', schedulePayload)
			} else if (executeAt) {
				// One-time schedule
				const delay = executeAt - Date.now()
				if (delay <= 0) {
					return Response.json({ error: 'Schedule time must be in the future' }, { status: 400 })
				}
				schedule = await this.schedule(delay, 'executeScheduledTask', schedulePayload)
			} else {
				return Response.json(
					{ error: 'Either executeAt or cron must be provided' },
					{ status: 400 },
				)
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

			return Response.json({ success: true, scheduled: schedule.id, task })
		} catch (error) {
			return Response.json(
				{ error: error instanceof Error ? error.message : 'Scheduling failed' },
				{ status: 500 },
			)
		}
	}

	/**
	 * Handle tool execution via HTTP.
	 */
	private async handleToolExecuteHTTP(payload: ToolExecutePayload): Promise<Response> {
		const { toolId, params } = payload

		if (!this.toolRegistry.has(toolId)) {
			return Response.json({ error: `Tool not found: ${toolId}` }, { status: 404 })
		}

		try {
			const context = this.createToolContext()
			const result = await this.toolRegistry.execute({ id: toolId, params, context })
			return Response.json({ success: true, toolId, result })
		} catch (error) {
			return Response.json(
				{
					success: false,
					toolId,
					error: error instanceof Error ? error.message : 'Tool execution failed',
				},
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

		if (!this.toolRegistry.has(toolId)) {
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
			const result = await this.toolRegistry.execute({ id: toolId, params, context })

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
		// Clean up old messages (keep last AGENT_MAX_STORED_MESSAGES)
		if (this.state.messages.length > AGENT_MAX_STORED_MESSAGES) {
			this.setState({
				...this.state,
				messages: this.state.messages.slice(-AGENT_MAX_STORED_MESSAGES),
				lastActivity: Date.now(),
			})
		}
	}

	/**
	 * Build system prompt including tool documentation.
	 */
	private buildSystemPrompt(): string {
		const parts: string[] = [this.state.instructions]

		// Inject agent configuration context
		parts.push(`\n\n## Your Configuration`)
		parts.push(`- Model: ${this.state.model}`)
		if (this.state.agentId) parts.push(`- Agent ID: ${this.state.agentId}`)

		const tools = this.toolRegistry.list()
		if (tools.length > 0) {
			parts.push('\n## Available Tools\n')
			parts.push('You have access to the following tools. Call them directly when needed:\n')

			for (const tool of tools) {
				parts.push(`- **${tool.id}**: ${tool.description}`)
			}
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
			agentId: this.state.agentId,
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
