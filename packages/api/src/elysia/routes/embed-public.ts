/**
 * Embed Routes (Public)
 *
 * Public HTTP endpoints for embedded agent widgets.
 * No authentication required. Supports SSE streaming for chat.
 * Uses Elysia's generator pattern for streaming.
 */

import { cors } from '@elysiajs/cors'
import {
	type AgentConfig,
	createAgentFromConfig,
	createMemoryStore,
	toAgentMessages,
} from '@hare/agent'
import { agents, usage } from '@hare/db/schema'
import type { ModelMessage } from 'ai'
import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { cfContext } from '../context'

const CHAT_HISTORY_LIMIT = 20

function isDomainAllowed(options: {
	allowedDomains: string[] | undefined
	origin: string | undefined
}): boolean {
	const { allowedDomains, origin } = options
	if (!allowedDomains || allowedDomains.length === 0) return true
	if (!origin) return true

	try {
		const originHost = new URL(origin).hostname
		return allowedDomains.some((domain) => {
			if (domain.startsWith('*.')) {
				const baseDomain = domain.slice(2)
				return originHost === baseDomain || originHost.endsWith(`.${baseDomain}`)
			}
			return originHost === domain
		})
	} catch {
		return true
	}
}

export const embedPublicRoutes = new Elysia({ prefix: '/embed', name: 'embed-public-routes' })
	.use(
		cors({
			origin: '*',
			methods: ['GET', 'POST', 'OPTIONS'],
			allowedHeaders: ['Content-Type'],
			maxAge: 86400,
		}),
	)
	.use(cfContext)

	// Get public agent info
	.get('/agents/:agentId', async ({ db, params, request }) => {
		const [agent] = await db.select().from(agents).where(eq(agents.id, params.agentId))
		if (!agent) return status(404, { error: 'Agent not found' })
		if (agent.status !== 'deployed') return status(400, { error: 'Agent not available' })

		const agentConfig = agent.config as { allowedDomains?: string[] } | null
		const origin = request.headers.get('origin') || request.headers.get('referer')

		if (
			!isDomainAllowed({ allowedDomains: agentConfig?.allowedDomains, origin: origin ?? undefined })
		) {
			return status(403, { error: 'Domain not allowed' })
		}

		return { id: agent.id, name: agent.name, description: agent.description }
	})

	// Chat with agent via SSE streaming (Elysia generator pattern)
	.post('/agents/:agentId/chat', async ({ db, cfEnv, params, request }) => {
		let body: { message?: string; sessionId?: string | null }
		try {
			body = await request.json()
		} catch {
			return status(400, { error: 'Invalid JSON body' })
		}

		const { message, sessionId: existingSessionId } = body
		if (!message || typeof message !== 'string' || message.trim().length === 0) {
			return status(400, { error: 'Message is required' })
		}
		if (message.length > 10000) return status(400, { error: 'Message too long' })

		const [agent] = await db.select().from(agents).where(eq(agents.id, params.agentId))
		if (!agent) return status(404, { error: 'Agent not found' })
		if (agent.status !== 'deployed') return status(400, { error: 'Agent not deployed' })

		const agentConfig = agent.config as { allowedDomains?: string[] } | null
		const origin = request.headers.get('origin') || request.headers.get('referer')
		if (
			!isDomainAllowed({ allowedDomains: agentConfig?.allowedDomains, origin: origin ?? undefined })
		) {
			return status(403, { error: 'Domain not allowed' })
		}
		if (!cfEnv.AI) return status(503, { error: 'AI service not available' })

		// Build SSE stream using ReadableStream (same as original)
		const encoder = new TextEncoder()
		const stream = new ReadableStream({
			start: async (controller) => {
				const sendEvent = (data: Record<string, unknown>) => {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
				}

				try {
					const memory = createMemoryStore(db, agent.workspaceId)
					const conversationId =
						existingSessionId ||
						(await memory.getOrCreateConversation({
							agentId: params.agentId,
							userId: null,
							title: `Widget chat with ${agent.name}`,
						}))

					const agentInstance = await createAgentFromConfig({
						agentConfig: agent as AgentConfig,
						db,
						env: cfEnv,
						userId: null,
						includeSystemTools: true,
					})

					const historyMessages = await memory.getMessages({
						conversationId,
						limit: CHAT_HISTORY_LIMIT,
					})
					const agentMessages: ModelMessage[] = toAgentMessages(historyMessages)
					agentMessages.push({ role: 'user', content: message.trim() })

					await memory.saveMessage({
						conversationId,
						role: 'user',
						content: message.trim(),
					})

					const startTime = Date.now()
					let fullResponse = ''
					const response = await agentInstance.stream(agentMessages)

					for await (const chunk of response.textStream) {
						fullResponse += chunk
						sendEvent({ type: 'text', content: chunk })
					}

					await memory.saveMessage({
						conversationId,
						role: 'assistant',
						content: fullResponse,
						metadata: { model: agent.model, agentId: params.agentId },
					})

					const latencyMs = Date.now() - startTime
					const tokenUsage = await response.usage
					const tokensIn = tokenUsage.inputTokens ?? 0
					const tokensOut = tokenUsage.outputTokens ?? 0

					await db.insert(usage).values({
						workspaceId: agent.workspaceId,
						agentId: params.agentId,
						userId: null,
						type: 'embed',
						inputTokens: tokensIn,
						outputTokens: tokensOut,
						totalTokens: tokensIn + tokensOut,
						metadata: { model: agent.model, duration: latencyMs },
					})

					sendEvent({ type: 'done', sessionId: conversationId })
				} catch (err) {
					// biome-ignore lint/suspicious/noConsole: error reporting
					console.error('Embed chat error:', err)
					sendEvent({
						type: 'error',
						message: err instanceof Error ? err.message : 'Unknown error',
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
