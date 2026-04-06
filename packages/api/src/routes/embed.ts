/**
 * Embed API Routes
 *
 * Public HTTP endpoints for embedded agent widgets.
 * No authentication required.
 * Supports SSE streaming for chat responses.
 */

import {
	type AgentConfig,
	createAgentFromConfig,
	createMemoryStore,
	toAgentMessages,
} from '@hare/agent'
import { AgentStatus } from '@hare/config'
import { agents, usage } from '@hare/db/schema'
import type { HonoEnv } from '@hare/types'
import type { ModelMessage } from 'ai'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCloudflareEnv, getDb } from '../db'

// Maximum number of history messages to include in context
const CHAT_HISTORY_LIMIT = 20

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a domain is allowed based on agent config.
 * Returns true if allowed, false if not.
 */
function isDomainAllowed(options: {
	allowedDomains: string[] | undefined
	origin: string | undefined
}): boolean {
	const { allowedDomains, origin } = options

	// No restrictions configured
	if (!allowedDomains || allowedDomains.length === 0) {
		return true
	}

	// No origin header
	if (!origin) {
		return true
	}

	try {
		const originHost = new URL(origin).hostname
		return allowedDomains.some((domain) => {
			// Support wildcard subdomains
			if (domain.startsWith('*.')) {
				const baseDomain = domain.slice(2)
				return originHost === baseDomain || originHost.endsWith(`.${baseDomain}`)
			}
			return originHost === domain
		})
	} catch {
		// Invalid origin URL, allow (permissive)
		return true
	}
}

// =============================================================================
// Route Handlers
// =============================================================================

const app = new Hono<HonoEnv>()

// Allow any origin for embed routes (embedding on external domains)
app.use(
	'*',
	cors({
		origin: '*',
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
		maxAge: 86400,
	}),
)

/**
 * GET /agents/:agentId
 * Get public agent info for embed widget.
 */
app.get('/agents/:agentId', async (c) => {
	const { agentId } = c.req.param()
	const db = getDb(c)

	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (agent.status !== AgentStatus.DEPLOYED) {
		return c.json({ error: 'Agent not available' }, 400)
	}

	// Check domain restrictions
	const config = agent.config as { allowedDomains?: string[] } | null
	const origin = c.req.header('origin') || c.req.header('referer')

	if (!isDomainAllowed({ allowedDomains: config?.allowedDomains, origin: origin ?? undefined })) {
		return c.json({ error: 'Domain not allowed' }, 403)
	}

	return c.json({
		id: agent.id,
		name: agent.name,
		description: agent.description,
	})
})

/**
 * POST /agents/:agentId/chat
 * Chat with agent via embed widget.
 * Returns SSE stream with text, done, and error events.
 */
app.post('/agents/:agentId/chat', async (c) => {
	const { agentId } = c.req.param()
	const db = getDb(c)
	const env = getCloudflareEnv(c)

	// Parse request body
	let body: { message?: string; sessionId?: string | null }
	try {
		body = await c.req.json<{ message?: string; sessionId?: string | null }>()
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400)
	}

	const { message, sessionId: existingSessionId } = body

	if (!message || typeof message !== 'string' || message.trim().length === 0) {
		return c.json({ error: 'Message is required' }, 400)
	}

	if (message.length > 10000) {
		return c.json({ error: 'Message too long' }, 400)
	}

	// Load agent
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (agent.status !== AgentStatus.DEPLOYED) {
		return c.json({ error: 'Agent not deployed' }, 400)
	}

	// Check domain restrictions
	const config = agent.config as { allowedDomains?: string[] } | null
	const origin = c.req.header('origin') || c.req.header('referer')

	if (!isDomainAllowed({ allowedDomains: config?.allowedDomains, origin: origin ?? undefined })) {
		return c.json({ error: 'Domain not allowed' }, 403)
	}

	if (!env.AI) {
		return c.json({ error: 'AI service not available' }, 503)
	}

	// Build SSE stream
	const encoder = new TextEncoder()

	const stream = new ReadableStream({
		start: async (controller) => {
			const sendEvent = (data: Record<string, unknown>) => {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
			}

			try {
				// Set up memory store
				const memory = createMemoryStore(db, agent.workspaceId)

				// Get or create conversation (null userId for anonymous embed sessions)
				const conversationId =
					existingSessionId ||
					(await memory.getOrCreateConversation({
						agentId,
						userId: null,
						title: `Widget chat with ${agent.name}`,
					}))

				// Create agent instance (null userId for anonymous)
				const agentInstance = await createAgentFromConfig({
					agentConfig: agent as AgentConfig,
					db,
					env,
					userId: null,
					includeSystemTools: true,
				})

				// Load conversation history
				const historyMessages = await memory.getMessages({
					conversationId,
					limit: CHAT_HISTORY_LIMIT,
				})
				const agentMessages: ModelMessage[] = toAgentMessages(historyMessages)

				// Add new user message
				agentMessages.push({ role: 'user', content: message.trim() })

				// Save user message
				await memory.saveMessage({
					conversationId,
					role: 'user',
					content: message.trim(),
				})

				// Stream response
				const startTime = Date.now()
				let fullResponse = ''

				const response = await agentInstance.stream(agentMessages)

				for await (const chunk of response.textStream) {
					fullResponse += chunk
					sendEvent({ type: 'text', content: chunk })
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
				// Estimate token counts (approx. 4 chars per token) as the AI SDK
				// does not return token counts for streaming edge-agent responses.
				const tokensIn = agentMessages.reduce((acc, m) => {
					const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
					return acc + Math.ceil(content.length / 4)
				}, 0)
				const tokensOut = Math.ceil(fullResponse.length / 4)

				await db.insert(usage).values({
					workspaceId: agent.workspaceId,
					agentId,
					userId: null,
					type: 'embed',
					inputTokens: tokensIn,
					outputTokens: tokensOut,
					totalTokens: tokensIn + tokensOut,
					metadata: {
						model: agent.model,
						duration: latencyMs,
					},
				})

				sendEvent({ type: 'done', sessionId: conversationId })
			} catch (error) {
				console.error('Embed chat error:', error)
				sendEvent({
					type: 'error',
					message: error instanceof Error ? error.message : 'Unknown error',
				})
			} finally {
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
})

export default app
