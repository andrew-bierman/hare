import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { streamSSE } from 'hono/streaming'
import { eq } from 'drizzle-orm'
import { ChatRequestSchema, ConversationSchema, IdParamSchema, MessageSchema } from '../schemas'
import { getDb } from '../db'
import { getWorkersAIModel } from '../models'
import { agents, conversations, messages } from 'web-app/db/schema'

// Define routes
const chatWithAgentRoute = createRoute({
	method: 'post',
	path: '/agents/{id}/chat',
	tags: ['Chat'],
	summary: 'Chat with agent',
	description: 'Send a message to an agent and receive a streaming response via Server-Sent Events',
	request: {
		params: IdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: ChatRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Streaming chat response',
			content: {
				'text/event-stream': {
					schema: z.object({
						event: z.string(),
						data: z.string(),
					}),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: {
				'application/json': {
					schema: z.object({
						error: z.string(),
					}),
				},
			},
		},
		400: {
			description: 'Agent not deployed',
			content: {
				'application/json': {
					schema: z.object({
						error: z.string(),
					}),
				},
			},
		},
	},
})

const listConversationsRoute = createRoute({
	method: 'get',
	path: '/agents/{id}/conversations',
	tags: ['Chat'],
	summary: 'List agent conversations',
	description: 'Get a list of all conversations for a specific agent',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'List of conversations',
			content: {
				'application/json': {
					schema: z.object({
						conversations: z.array(ConversationSchema),
					}),
				},
			},
		},
	},
})

const getConversationMessagesRoute = createRoute({
	method: 'get',
	path: '/conversations/{id}/messages',
	tags: ['Chat'],
	summary: 'Get conversation messages',
	description: 'Retrieve all messages in a conversation',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'List of messages',
			content: {
				'application/json': {
					schema: z.object({
						messages: z.array(MessageSchema),
					}),
				},
			},
		},
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(chatWithAgentRoute, async (c) => {
		const { id: agentId } = c.req.valid('param')
		const { message, sessionId, metadata } = c.req.valid('json')
		const db = getDb(c)
		const ai = (c.env as { AI: Ai }).AI

		// Load agent config from DB
		const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))

		if (!agentConfig) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		if (agentConfig.status !== 'deployed') {
			return c.json({ error: 'Agent not deployed' }, 400)
		}

		// Get or create conversation
		const conversationId = sessionId || crypto.randomUUID()

		// Stream the response
		return streamSSE(c, async (stream) => {
			const startTime = Date.now()
			let fullResponse = ''
			let tokensOut = 0

			try {
				// Call Workers AI
				const modelName = getWorkersAIModel(agentConfig.model)

				const aiStream = await ai.run(modelName, {
					messages: [
						{ role: 'system', content: agentConfig.instructions || 'You are a helpful assistant.' },
						{ role: 'user', content: message },
					],
					stream: true,
				})

				// Stream tokens
				for await (const chunk of aiStream) {
					if (chunk.response) {
						fullResponse += chunk.response
						tokensOut++
						await stream.writeSSE({
							event: 'message',
							data: JSON.stringify({ type: 'text', content: chunk.response }),
						})
					}
				}

				// Save message to DB
				await db.insert(messages).values({
					conversationId,
					role: 'assistant',
					content: fullResponse,
					metadata: metadata ? (metadata as any) : undefined,
				})

				// Send done event
				await stream.writeSSE({
					event: 'done',
					data: JSON.stringify({
						type: 'done',
						sessionId: conversationId,
						usage: {
							tokensOut,
							latencyMs: Date.now() - startTime,
						},
					}),
				})
			} catch (error) {
				await stream.writeSSE({
					event: 'error',
					data: JSON.stringify({
						type: 'error',
						message: error instanceof Error ? error.message : 'Unknown error',
					}),
				})
			}
		})
	})
	.openapi(listConversationsRoute, async (c) => {
		const { id: agentId } = c.req.valid('param')
		const db = getDb(c)

		const results = await db.select().from(conversations).where(eq(conversations.agentId, agentId))

		return c.json({ conversations: results })
	})
	.openapi(getConversationMessagesRoute, async (c) => {
		const { id: conversationId } = c.req.valid('param')
		const db = getDb(c)

		const results = await db.select().from(messages).where(eq(messages.conversationId, conversationId))

		return c.json({ messages: results })
	})

export default app
