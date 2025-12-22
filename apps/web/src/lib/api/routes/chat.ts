import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { streamSSE } from 'hono/streaming'
import { eq } from 'drizzle-orm'
import { ChatRequestSchema, ConversationSchema, IdParamSchema, MessageSchema } from '../schemas'
import { getDb, getCloudflareEnv } from '../db'
import { agents, conversations, messages, usage } from 'web-app/db/schema'
import { createAgentFromConfig, type AgentConfig } from 'web-app/lib/agents'
import { createMemoryStore, toAgentMessages } from 'web-app/lib/agents/memory'
import type { CoreMessage } from 'ai'
import { optionalAuthMiddleware, type AuthVariables } from '../middleware'

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
		503: {
			description: 'Service unavailable',
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
		503: {
			description: 'Service unavailable',
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
		503: {
			description: 'Service unavailable',
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

// Create app
const app = new OpenAPIHono<{ Variables: Partial<AuthVariables> }>()

// Apply optional auth middleware - chat can work with or without auth
app.use('*', optionalAuthMiddleware)

// Chat with agent
app.openapi(chatWithAgentRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const { message, sessionId, metadata } = c.req.valid('json')
	const db = await getDb(c)
	const env = await getCloudflareEnv(c)

	// Get user from auth context (may be undefined for API key auth)
	const user = c.get('user')
	const userId = user?.id || 'anonymous'

	if (!env.AI) {
		return c.json({ error: 'AI service not available' }, 503)
	}

	// Load agent config from DB
	const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agentConfig) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (agentConfig.status !== 'deployed') {
		return c.json({ error: 'Agent not deployed' }, 400)
	}

	// Set up memory store
	const memory = createMemoryStore(db, env.AI, env.VECTORIZE, agentConfig.workspaceId)

	// Get or create conversation
	const conversationId = sessionId || (await memory.getOrCreateConversation(agentId, userId, `Chat with ${agentConfig.name}`))

	// Create the edge agent
	const agent = await createAgentFromConfig(agentConfig as AgentConfig, db, env, {
		userId,
		includeSystemTools: true,
	})

	// Load conversation history
	const historyMessages = await memory.getMessages(conversationId, 20)
	const agentMessages: CoreMessage[] = toAgentMessages(historyMessages)

	// Add the new user message
	agentMessages.push({ role: 'user' as const, content: message })

	// Save user message to memory
	await memory.saveMessage(conversationId, 'user', message, metadata as Record<string, unknown>)

	// Stream the response
	return streamSSE(c, async (stream) => {
		const startTime = Date.now()
		let fullResponse = ''
		let tokensIn = 0
		let tokensOut = 0

		try {
			// Use Edge agent to generate response
			const response = await agent.stream(agentMessages)

			// Stream text chunks
			for await (const chunk of response.textStream) {
				fullResponse += chunk

				await stream.writeSSE({
					event: 'message',
					data: JSON.stringify({ type: 'text', content: chunk }),
				})
			}

			// Save assistant message to memory
			await memory.saveMessage(conversationId, 'assistant', fullResponse, {
				model: agentConfig.model,
				agentId,
			})

			// Track usage (token counts are rough estimates based on ~4 chars/token)
			// TODO: Use actual token counts from AI provider response when available
			const latencyMs = Date.now() - startTime
			tokensIn = agentMessages.reduce((acc, m) => {
				const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
				return acc + Math.ceil(content.length / 4)
			}, 0)
			tokensOut = Math.ceil(fullResponse.length / 4)

			await db.insert(usage).values({
				workspaceId: agentConfig.workspaceId,
				agentId,
				userId,
				type: 'chat',
				inputTokens: tokensIn,
				outputTokens: tokensOut,
				totalTokens: tokensIn + tokensOut,
				metadata: {
					model: agentConfig.model,
					duration: latencyMs,
				},
			})

			// Send done event
			await stream.writeSSE({
				event: 'done',
				data: JSON.stringify({
					type: 'done',
					sessionId: conversationId,
					usage: {
						tokensIn,
						tokensOut,
						latencyMs,
					},
				}),
			})
		} catch (error) {
			console.error('Chat error:', error)

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

// List conversations
app.openapi(listConversationsRoute, async (c) => {
	const { id: agentId } = c.req.valid('param')
	const db = await getDb(c)

	const results = await db.select().from(conversations).where(eq(conversations.agentId, agentId))

	// Get message counts for each conversation
	const conversationsData = await Promise.all(
		results.map(async (conv) => {
			const messageCount = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, conv.id))
				.then((rows) => rows.length)

			return {
				id: conv.id,
				agentId: conv.agentId,
				userId: conv.userId,
				title: conv.title || 'Untitled Conversation',
				messageCount,
				createdAt: conv.createdAt.toISOString(),
				updatedAt: conv.updatedAt.toISOString(),
			}
		})
	)

	return c.json({ conversations: conversationsData }, 200)
})

// Get conversation messages
app.openapi(getConversationMessagesRoute, async (c) => {
	const { id: conversationId } = c.req.valid('param')
	const db = await getDb(c)

	const results = await db.select().from(messages).where(eq(messages.conversationId, conversationId))

	// Transform DB results to match API schema (filter out 'tool' role for API response)
	const messagesData = results
		.filter((msg) => msg.role !== 'tool')
		.map((msg) => ({
			id: msg.id,
			conversationId: msg.conversationId,
			role: msg.role as 'user' | 'assistant' | 'system',
			content: msg.content,
			createdAt: msg.createdAt.toISOString(),
		}))

	return c.json({ messages: messagesData }, 200)
})

export default app
