/**
 * Durable Object-based Hare Agent using Cloudflare Agents SDK
 * 
 * Each agent instance is a persistent Durable Object with:
 * - Persistent state (conversation history, context)
 * - SQLite database for agent-specific data
 * - WebSocket support for real-time chat
 * - HTTP API for REST compatibility
 */

import type { CoreMessage } from 'ai'
import { streamText } from 'ai'
import { createWorkersAIModel } from '../providers/workers-ai'

export interface AgentConfiguration {
	id: string
	name: string
	description?: string
	instructions: string
	model: string
	workspaceId: string
	config?: {
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
	}
	tools?: string[]
}

/**
 * HareAgent - Durable Object implementation
 * Extends base Agent functionality from CF Agents SDK
 */
export class HareAgent {
	private state: DurableObjectState
	private env: CloudflareEnv
	private aiModel: ReturnType<typeof createWorkersAIModel> | null = null
	private isInitialized = false

	constructor(state: DurableObjectState, env: CloudflareEnv) {
		this.state = state
		this.env = env
	}

	/**
	 * Initialize agent with configuration
	 */
	async initialize(config: AgentConfiguration): Promise<void> {
		if (this.isInitialized) {
			return
		}

		// Store configuration in Durable Object state
		await this.state.storage.put('config', config)

		// Initialize AI model
		this.aiModel = createWorkersAIModel(config.model, this.env.AI)

		// Initialize conversation history if not exists
		const history = await this.state.storage.get<CoreMessage[]>('history')
		if (!history) {
			await this.state.storage.put('history', [])
		}

		this.isInitialized = true
	}

	/**
	 * Get agent configuration
	 */
	private async getConfig(): Promise<AgentConfiguration> {
		const config = await this.state.storage.get<AgentConfiguration>('config')
		if (!config) {
			throw new Error('Agent not initialized')
		}
		return config
	}

	/**
	 * Get conversation history
	 */
	private async getHistory(): Promise<CoreMessage[]> {
		return (await this.state.storage.get<CoreMessage[]>('history')) ?? []
	}

	/**
	 * Add message to history
	 */
	private async addToHistory(message: CoreMessage): Promise<void> {
		const history = await this.getHistory()
		history.push(message)
		await this.state.storage.put('history', history)
	}

	/**
	 * Clear conversation history
	 */
	async clearHistory(): Promise<void> {
		await this.state.storage.put('history', [])
	}

	/**
	 * Handle incoming requests (HTTP and WebSocket)
	 */
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		const path = url.pathname

		try {
			// WebSocket upgrade
			if (request.headers.get('Upgrade') === 'websocket') {
				return this.handleWebSocket(request)
			}

			// Initialize endpoint
			if (path === '/initialize' && request.method === 'POST') {
				const config = (await request.json()) as AgentConfiguration
				await this.initialize(config)
				return new Response(JSON.stringify({ success: true }), {
					headers: { 'Content-Type': 'application/json' },
				})
			}

			// Ensure agent is initialized for other routes
			if (!this.isInitialized) {
				const config = await this.getConfig()
				await this.initialize(config)
			}

			// Chat endpoint
			if (path === '/chat' && request.method === 'POST') {
				return await this.handleChatRequest(request)
			}

			// Get conversation history
			if (path === '/history' && request.method === 'GET') {
				const history = await this.getHistory()
				return new Response(JSON.stringify({ history }), {
					headers: { 'Content-Type': 'application/json' },
				})
			}

			// Clear history
			if (path === '/history' && request.method === 'DELETE') {
				await this.clearHistory()
				return new Response(JSON.stringify({ success: true }), {
					headers: { 'Content-Type': 'application/json' },
				})
			}

			// Get agent status
			if (path === '/status' && request.method === 'GET') {
				const config = await this.getConfig()
				const history = await this.getHistory()
				return new Response(
					JSON.stringify({
						id: config.id,
						name: config.name,
						isInitialized: this.isInitialized,
						messageCount: history.length,
					}),
					{
						headers: { 'Content-Type': 'application/json' },
					},
				)
			}

			return new Response('Not found', { status: 404 })
		} catch (error) {
			console.error('HareAgent error:', error)
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : 'Unknown error',
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}
	}

	/**
	 * Handle WebSocket connections
	 */
	private async handleWebSocket(request: Request): Promise<Response> {
		const pair = new WebSocketPair()
		const [client, server] = Object.values(pair)

		// Accept WebSocket connection
		this.state.acceptWebSocket(server)

		// Set up event handlers
		server.addEventListener('message', async (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data as string)

				if (data.type === 'chat' && data.message) {
					await this.handleWebSocketChat(server, data.message)
				} else if (data.type === 'clear_history') {
					await this.clearHistory()
					server.send(JSON.stringify({ type: 'history_cleared' }))
				}
			} catch (error) {
				console.error('WebSocket message error:', error)
				server.send(
					JSON.stringify({
						type: 'error',
						error: error instanceof Error ? error.message : 'Unknown error',
					}),
				)
			}
		})

		server.addEventListener('close', () => {
			console.log('Client disconnected')
		})

		// Send welcome and history on connect
		server.send(JSON.stringify({ type: 'connected', message: 'Connected to agent' }))
		const history = await this.getHistory()
		server.send(JSON.stringify({ type: 'history', history }))

		return new Response(null, {
			status: 101,
			webSocket: client,
		})
	}

	/**
	 * Handle HTTP chat request
	 */
	private async handleChatRequest(request: Request): Promise<Response> {
		const { message } = (await request.json()) as { message: string }

		if (!message) {
			return new Response(JSON.stringify({ error: 'Message is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		// Get configuration and history
		const config = await this.getConfig()
		const history = await this.getHistory()

		// Add user message
		const userMessage: CoreMessage = {
			role: 'user',
			content: message,
		}
		await this.addToHistory(userMessage)

		// Build system message
		const systemMessage: CoreMessage = {
			role: 'system',
			content: config.instructions,
		}

		// Generate response
		const messages = [systemMessage, ...history, userMessage]

		if (!this.aiModel) {
			throw new Error('AI model not initialized')
		}

		const result = await streamText({
			model: this.aiModel,
			messages,
			temperature: config.config?.temperature,
			maxTokens: config.config?.maxTokens,
			topP: config.config?.topP,
		})

		// Get full response
		const fullResponse = await result.text

		// Add assistant message to history
		const assistantMessage: CoreMessage = {
			role: 'assistant',
			content: fullResponse,
		}
		await this.addToHistory(assistantMessage)

		return new Response(
			JSON.stringify({
				response: fullResponse,
				messageCount: history.length + 2,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			},
		)
	}

	/**
	 * Handle WebSocket chat (streaming)
	 */
	private async handleWebSocketChat(ws: WebSocket, message: string): Promise<void> {
		// Get configuration and history
		const config = await this.getConfig()
		const history = await this.getHistory()

		// Add user message
		const userMessage: CoreMessage = {
			role: 'user',
			content: message,
		}
		await this.addToHistory(userMessage)

		// Send user message confirmation
		ws.send(JSON.stringify({ type: 'user_message', message }))

		// Build system message
		const systemMessage: CoreMessage = {
			role: 'system',
			content: config.instructions,
		}

		// Generate streaming response
		const messages = [systemMessage, ...history, userMessage]

		if (!this.aiModel) {
			throw new Error('AI model not initialized')
		}

		const result = streamText({
			model: this.aiModel,
			messages,
			temperature: config.config?.temperature,
			maxTokens: config.config?.maxTokens,
			topP: config.config?.topP,
		})

		// Stream chunks to client
		let fullResponse = ''
		for await (const chunk of (await result).textStream) {
			fullResponse += chunk
			ws.send(JSON.stringify({ type: 'chunk', content: chunk }))
		}

		// Add assistant message to history
		const assistantMessage: CoreMessage = {
			role: 'assistant',
			content: fullResponse,
		}
		await this.addToHistory(assistantMessage)

		// Send done message
		ws.send(JSON.stringify({ type: 'done', fullResponse }))
	}
}

export default HareAgent
