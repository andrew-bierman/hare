/**
 * Embed Router (oRPC)
 *
 * Public endpoints for embedded agent widgets. No authentication required.
 * Supports SSE streaming for chat responses.
 */

import { z } from 'zod'
import { eventIterator } from '@orpc/server'
import { eq } from 'drizzle-orm'
import { agents, usage } from '@hare/db/schema'
import {
	type AgentConfig,
	createAgentFromConfig,
	createMemoryStore,
	toAgentMessages,
} from '@hare/agent'
import type { ModelMessage } from 'ai'
import { publicProcedure } from '../base'

// =============================================================================
// Schemas
// =============================================================================

const embedAgentParamSchema = z.object({
	agentId: z.string(),
})

const embedChatRequestSchema = z.object({
	agentId: z.string(),
	message: z.string().min(1, 'Message is required').max(10000),
	sessionId: z.string().nullish(),
})

const embedAgentResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
})

const embedStreamEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('text'),
		content: z.string(),
	}),
	z.object({
		type: z.literal('done'),
		sessionId: z.string(),
	}),
	z.object({
		type: z.literal('error'),
		message: z.string(),
	}),
])

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
// Procedures
// =============================================================================

/**
 * Get agent info for embed widget.
 * Public endpoint - no authentication required.
 */
const getAgent = publicProcedure
	.route({ method: 'GET', path: '/embed/agents/{agentId}' })
	.input(embedAgentParamSchema)
	.output(embedAgentResponseSchema)
	.handler(async ({ input, context }) => {
		const { agentId } = input
		const { db, headers } = context

		const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

		if (!agent) {
			throw new Error('Agent not found')
		}

		// Check if agent is deployed
		if (agent.status !== 'deployed') {
			throw new Error('Agent not available')
		}

		// Check domain restrictions
		const config = agent.config as { allowedDomains?: string[] } | null
		const origin = headers.get('origin') || headers.get('referer')

		if (!isDomainAllowed({ allowedDomains: config?.allowedDomains, origin: origin ?? undefined })) {
			throw new Error('Domain not allowed')
		}

		return {
			id: agent.id,
			name: agent.name,
			description: agent.description,
		}
	})

/**
 * Chat with agent via embed widget.
 * Public endpoint with SSE streaming response.
 */
const chat = publicProcedure
	.route({ method: 'POST', path: '/embed/agents/{agentId}/chat' })
	.input(embedChatRequestSchema)
	.output(eventIterator(embedStreamEventSchema))
	.handler(async function* ({ input, context }) {
		const { agentId, message, sessionId: existingSessionId } = input
		const { db, env, headers } = context

		// Load agent
		const [agent] = await db.select().from(agents).where(eq(agents.id, agentId))

		if (!agent) {
			yield { type: 'error' as const, message: 'Agent not found' }
			return
		}

		if (agent.status !== 'deployed') {
			yield { type: 'error' as const, message: 'Agent not deployed' }
			return
		}

		// Check domain restrictions
		const config = agent.config as { allowedDomains?: string[] } | null
		const origin = headers.get('origin') || headers.get('referer')

		if (!isDomainAllowed({ allowedDomains: config?.allowedDomains, origin: origin ?? undefined })) {
			yield { type: 'error' as const, message: 'Domain not allowed' }
			return
		}

		if (!env.AI) {
			yield { type: 'error' as const, message: 'AI service not available' }
			return
		}

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
		const startTime = Date.now()
		let fullResponse = ''

		try {
			const response = await agentInstance.stream(agentMessages)

			for await (const chunk of response.textStream) {
				fullResponse += chunk
				yield { type: 'text' as const, content: chunk }
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

			yield { type: 'done' as const, sessionId: conversationId }
		} catch (error) {
			console.error('Embed chat error:', error)
			yield {
				type: 'error' as const,
				message: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	})

// =============================================================================
// Export
// =============================================================================

export const embedRouter = {
	getAgent,
	chat,
}
