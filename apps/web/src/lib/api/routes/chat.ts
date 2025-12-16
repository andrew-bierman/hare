import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { streamSSE } from 'hono/streaming'
import { ChatRequestSchema, ConversationSchema, IdParamSchema, MessageSchema } from '../schemas'

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
		const { id: _agentId } = c.req.valid('param')
		const { message, sessionId } = c.req.valid('json')

		// TODO: Validate agent exists and is deployed
		// TODO: Forward to agent runtime worker

		return streamSSE(c, async (stream) => {
			// Simulate streaming response
			const tokens = message.split(' ')

			for (const token of tokens) {
				await stream.writeSSE({
					event: 'message',
					data: JSON.stringify({
						type: 'text',
						content: `${token} `,
					}),
				})
				await new Promise((resolve) => setTimeout(resolve, 50))
			}

			await stream.writeSSE({
				event: 'done',
				data: JSON.stringify({
					type: 'done',
					sessionId: sessionId || `session_${crypto.randomUUID().slice(0, 8)}`,
					usage: {
						tokensIn: 10,
						tokensOut: tokens.length,
						latencyMs: 500,
					},
				}),
			})
		})
	})
	.openapi(listConversationsRoute, async (c) => {
		const { id: agentId } = c.req.valid('param')
		// TODO: Get from DB
		return c.json({
			conversations: [
				{
					id: 'conv_xxx',
					agentId,
					userId: 'user_xxx',
					title: 'Chat about features',
					messageCount: 5,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		})
	})
	.openapi(getConversationMessagesRoute, async (c) => {
		const { id: conversationId } = c.req.valid('param')
		// TODO: Get from DB
		return c.json({
			messages: [
				{
					id: 'msg_1',
					conversationId,
					role: 'user' as const,
					content: 'Hello!',
					createdAt: new Date(Date.now() - 60000).toISOString(),
				},
				{
					id: 'msg_2',
					conversationId,
					role: 'assistant' as const,
					content: 'Hi! How can I help you today?',
					createdAt: new Date().toISOString(),
				},
			],
		})
	})

export default app
