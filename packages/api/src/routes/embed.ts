import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { ModelMessage } from 'ai'
import { eq } from 'drizzle-orm'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { agents, usage } from 'web-app/db/schema'
import { type AgentConfig, createAgentFromConfig } from 'web-app/lib/agents'
import { createMemoryStore, toAgentMessages } from 'web-app/lib/agents/memory'
import { getCloudflareEnv, getDb } from '../db'
import type { HonoEnv } from '@hare/types'

// =============================================================================
// Schemas
// =============================================================================

const EmbedAgentParamSchema = z.object({
	agentId: z.string().openapi({ example: 'agent_abc123' }),
})

const EmbedChatRequestSchema = z.object({
	message: z.string().min(1, 'Message is required').max(10000),
	sessionId: z.string().optional(),
})

const EmbedAgentResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
})

// =============================================================================
// Routes
// =============================================================================

const getEmbedAgentRoute = createRoute({
	method: 'get',
	path: '/agents/{agentId}',
	tags: ['Embed'],
	summary: 'Get agent info for embed',
	description: 'Returns minimal agent information for the embedded widget',
	request: {
		params: EmbedAgentParamSchema,
	},
	responses: {
		200: {
			description: 'Agent info',
			content: {
				'application/json': {
					schema: EmbedAgentResponseSchema,
				},
			},
		},
		403: {
			description: 'Domain not allowed',
			content: {
				'application/json': {
					schema: z.object({ error: z.string() }),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: {
				'application/json': {
					schema: z.object({ error: z.string() }),
				},
			},
		},
	},
})

const embedChatRoute = createRoute({
	method: 'post',
	path: '/agents/{agentId}/chat',
	tags: ['Embed'],
	summary: 'Chat with agent via embed',
	description: 'Send a message to an agent from the embedded widget',
	request: {
		params: EmbedAgentParamSchema,
		body: {
			content: {
				'application/json': {
					schema: EmbedChatRequestSchema,
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
		400: {
			description: 'Agent not deployed or embed not enabled',
			content: {
				'application/json': {
					schema: z.object({ error: z.string() }),
				},
			},
		},
		403: {
			description: 'Domain not allowed',
			content: {
				'application/json': {
					schema: z.object({ error: z.string() }),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: {
				'application/json': {
					schema: z.object({ error: z.string() }),
				},
			},
		},
		503: {
			description: 'AI service not available',
			content: {
				'application/json': {
					schema: z.object({ error: z.string() }),
				},
			},
		},
	},
})

// =============================================================================
// App
// =============================================================================

const app = new OpenAPIHono<HonoEnv>()

// CORS middleware for embed routes - allows any origin for public embeds
// Individual agents can have allowedDomains configured for additional security
app.use(
	'*',
	cors({
		origin: (origin) => {
			// Allow any origin for embed widget
			// Per-agent domain restrictions are checked in the route handlers
			return origin || '*'
		},
		credentials: false,
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
		exposeHeaders: [],
		maxAge: 86400,
	}),
)

// Get agent info
app.openapi(getEmbedAgentRoute, async (c) => {
	const { agentId } = c.req.valid('param')
	const db = getDb(c)

	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Check if agent is deployed and embed is enabled
	if (agent.status !== 'deployed') {
		return c.json({ error: 'Agent not available' }, 404)
	}

	// Check domain restrictions if configured
	const config = agent.config as { allowedDomains?: string[] } | null
	const allowedDomains = config?.allowedDomains
	if (allowedDomains && allowedDomains.length > 0) {
		const origin = c.req.header('origin') || c.req.header('referer')
		if (origin) {
			try {
				const originHost = new URL(origin).hostname
				const isAllowed = allowedDomains.some((domain) => {
					// Support wildcard subdomains
					if (domain.startsWith('*.')) {
						const baseDomain = domain.slice(2)
						return originHost === baseDomain || originHost.endsWith(`.${baseDomain}`)
					}
					return originHost === domain
				})
				if (!isAllowed) {
					return c.json({ error: 'Domain not allowed' }, 403)
				}
			} catch {
				// Invalid origin, continue
			}
		}
	}

	return c.json(
		{
			id: agent.id,
			name: agent.name,
			description: agent.description,
		},
		200,
	)
})

// Chat with agent
app.openapi(embedChatRoute, async (c) => {
	const { agentId } = c.req.valid('param')
	const { message, sessionId: existingSessionId } = c.req.valid('json')
	const db = getDb(c)
	const env = getCloudflareEnv(c)

	// Load agent
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (agent.status !== 'deployed') {
		return c.json({ error: 'Agent not deployed' }, 400)
	}

	// Check domain restrictions
	const config = agent.config as { allowedDomains?: string[] } | null
	const allowedDomains = config?.allowedDomains
	if (allowedDomains && allowedDomains.length > 0) {
		const origin = c.req.header('origin') || c.req.header('referer')
		if (origin) {
			try {
				const originHost = new URL(origin).hostname
				const isAllowed = allowedDomains.some((domain) => {
					if (domain.startsWith('*.')) {
						const baseDomain = domain.slice(2)
						return originHost === baseDomain || originHost.endsWith(`.${baseDomain}`)
					}
					return originHost === domain
				})
				if (!isAllowed) {
					return c.json({ error: 'Domain not allowed' }, 403)
				}
			} catch {
				// Invalid origin
			}
		}
	}

	if (!env.AI) {
		return c.json({ error: 'AI service not available' }, 503)
	}

	// Use 'embed' as user ID for widget users
	const userId = 'embed'

	// Set up memory store
	const memory = createMemoryStore(db, agent.workspaceId)

	// Get or create conversation
	const conversationId =
		existingSessionId ||
		(await memory.getOrCreateConversation({
			agentId,
			userId,
			title: `Widget chat with ${agent.name}`,
		}))

	// Create agent
	const agentInstance = await createAgentFromConfig({
		agentConfig: agent as AgentConfig,
		db,
		env,
		userId,
		includeSystemTools: true,
	})

	// Load conversation history
	const historyMessages = await memory.getMessages({
		conversationId,
		limit: 20,
	})
	const agentMessages: ModelMessage[] = toAgentMessages(historyMessages)

	// Add new user message
	agentMessages.push({ role: 'user', content: message })

	// Save user message
	await memory.saveMessage({
		conversationId,
		role: 'user',
		content: message,
	})

	// Stream response
	return streamSSE(c, async (stream) => {
		const startTime = Date.now()
		let fullResponse = ''

		try {
			const response = await agentInstance.stream(agentMessages)

			for await (const chunk of response.textStream) {
				fullResponse += chunk
				await stream.writeSSE({
					event: 'message',
					data: JSON.stringify({ type: 'text', content: chunk }),
				})
			}

			// Save assistant message
			await memory.saveMessage({
				conversationId,
				role: 'assistant',
				content: fullResponse,
				metadata: {
					model: agent.model,
					agentId,
				},
			})

			// Track usage
			const latencyMs = Date.now() - startTime
			const tokensIn = agentMessages.reduce((acc, m) => {
				const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
				return acc + Math.ceil(content.length / 4)
			}, 0)
			const tokensOut = Math.ceil(fullResponse.length / 4)

			await db.insert(usage).values({
				workspaceId: agent.workspaceId,
				agentId,
				userId,
				type: 'embed',
				inputTokens: tokensIn,
				outputTokens: tokensOut,
				totalTokens: tokensIn + tokensOut,
				metadata: {
					model: agent.model,
					duration: latencyMs,
				},
			})

			await stream.writeSSE({
				event: 'done',
				data: JSON.stringify({
					type: 'done',
					sessionId: conversationId,
				}),
			})
		} catch (error) {
			console.error('Embed chat error:', error)
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

export default app
