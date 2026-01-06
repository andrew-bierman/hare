/**
 * oRPC Chat Router
 *
 * Handles chat operations including streaming responses, conversations, and exports.
 */

import { z } from 'zod'
import { eventIterator, withEventMeta } from '@orpc/server'
import { streamText, type ModelMessage } from 'ai'
import { eq } from 'drizzle-orm'
import { agents, conversations, messages, usage } from '@hare/db/schema'
import {
	type AgentConfig,
	createAgentFromConfig,
	createMemoryStore,
	toAgentMessages,
} from '@hare/agent'
import { authedProcedure, notFound, badRequest, serverError, type AuthContext } from '../base'
import {
	ChatRequestSchema,
	ConversationExportSchema,
	ConversationSchema,
	ExportQuerySchema,
	IdParamSchema,
	MessageSchema,
} from '../../schemas'

// =============================================================================
// Export Helpers
// =============================================================================

/**
 * Convert conversation messages to Markdown format.
 */
function formatAsMarkdown(options: {
	title: string
	messages: Array<{
		role: string
		content: string
		createdAt: Date
		metadata?: Record<string, unknown> | null
	}>
	includeMetadata: boolean
	exportedAt: string
}): string {
	const { title, messages, includeMetadata, exportedAt } = options

	const lines: string[] = [`# ${title}`, '', `*Exported at: ${exportedAt}*`, '', '---', '']

	for (const msg of messages) {
		const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1)
		const timestamp = msg.createdAt.toISOString()

		lines.push(`## ${roleLabel}`)
		lines.push(`*${timestamp}*`)
		lines.push('')
		lines.push(msg.content)

		if (includeMetadata && msg.metadata) {
			lines.push('')
			lines.push('<details>')
			lines.push('<summary>Metadata</summary>')
			lines.push('')
			lines.push('```json')
			lines.push(JSON.stringify(msg.metadata, null, 2))
			lines.push('```')
			lines.push('</details>')
		}

		lines.push('')
		lines.push('---')
		lines.push('')
	}

	return lines.join('\n')
}

// =============================================================================
// Streaming Event Schemas
// =============================================================================

/**
 * Schema for streaming chat events.
 */
const ChatStreamEventSchema = z.discriminatedUnion('type', [
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
// Procedures
// =============================================================================

/**
 * Chat with an agent (streaming response).
 *
 * Note: This procedure uses oRPC's eventIterator for SSE streaming.
 * The streaming response yields text chunks followed by a done event.
 */
export const chatWithAgent = authedProcedure
	.route({ method: 'POST', path: '/agents/{id}/chat' })
	.input(IdParamSchema.merge(ChatRequestSchema))
	.output(eventIterator(ChatStreamEventSchema))
	.handler(async function* ({ input, context }) {
		const { id: agentId, message, sessionId, metadata } = input
		const { db, user, env } = context

		if (!env.AI) {
			yield { type: 'error' as const, message: 'AI service not available' }
			return
		}

		// Load agent config from DB
		const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))

		if (!agentConfig) {
			yield { type: 'error' as const, message: 'Agent not found' }
			return
		}

		if (agentConfig.status !== 'deployed') {
			yield { type: 'error' as const, message: 'Agent not deployed' }
			return
		}

		// Set up memory store
		const memory = createMemoryStore(db, agentConfig.workspaceId)

		// Get or create conversation
		const conversationId =
			sessionId ||
			(await memory.getOrCreateConversation({
				agentId,
				userId: user.id,
				title: `Chat with ${agentConfig.name}`,
			}))

		// Create the edge agent
		const agent = await createAgentFromConfig({
			agentConfig: agentConfig as AgentConfig,
			db,
			env,
			userId: user.id,
			includeSystemTools: true,
		})

		// Load conversation history
		const historyMessages = await memory.getMessages({
			conversationId,
			limit: 20,
		})
		const agentMessages: ModelMessage[] = toAgentMessages(historyMessages)

		// Add the new user message
		agentMessages.push({ role: 'user' as const, content: message })

		// Save user message to memory
		await memory.saveMessage({
			conversationId,
			role: 'user',
			content: message,
			metadata: metadata as Record<string, unknown>,
		})

		// Track timing for usage metrics
		const startTime = Date.now()
		let fullResponse = ''

		try {
			// Stream the response
			const result = streamText({
				model: agent.model,
				messages: [{ role: 'system', content: agent.instructions }, ...agentMessages],
			})

			// Yield text chunks as they arrive
			for await (const chunk of result.textStream) {
				fullResponse += chunk
				yield { type: 'text' as const, content: chunk }
			}

			// Save assistant message to memory
			await memory.saveMessage({
				conversationId,
				role: 'assistant',
				content: fullResponse,
				metadata: {
					model: agentConfig.model,
					agentId,
				},
			})

			// Track usage (token counts are rough estimates based on ~4 chars/token)
			const latencyMs = Date.now() - startTime
			const tokensIn = agentMessages.reduce((acc, m) => {
				const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
				return acc + Math.ceil(content.length / 4)
			}, 0)
			const tokensOut = Math.ceil(fullResponse.length / 4)

			await db.insert(usage).values({
				workspaceId: agentConfig.workspaceId,
				agentId,
				userId: user.id,
				type: 'chat',
				inputTokens: tokensIn,
				outputTokens: tokensOut,
				totalTokens: tokensIn + tokensOut,
				metadata: {
					model: agentConfig.model,
					duration: latencyMs,
				},
			})

			// Signal completion with session ID
			yield { type: 'done' as const, sessionId: conversationId }
		} catch (error) {
			console.error('Error during chat streaming:', error)
			yield {
				type: 'error' as const,
				message: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	})

/**
 * List all conversations for an agent.
 */
export const listConversations = authedProcedure
	.route({ method: 'GET', path: '/agents/{id}/conversations' })
	.input(IdParamSchema)
	.output(z.object({ conversations: z.array(ConversationSchema) }))
	.handler(async ({ input, context }) => {
		const { id: agentId } = input
		const { db } = context

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
			}),
		)

		return { conversations: conversationsData }
	})

/**
 * Get all messages in a conversation.
 */
export const getMessages = authedProcedure
	.route({ method: 'GET', path: '/conversations/{id}/messages' })
	.input(IdParamSchema)
	.output(z.object({ messages: z.array(MessageSchema) }))
	.handler(async ({ input, context }) => {
		const { id: conversationId } = input
		const { db } = context

		const results = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))

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

		return { messages: messagesData }
	})

/**
 * Export a conversation in JSON or Markdown format.
 */
export const exportConversation = authedProcedure
	.route({ method: 'GET', path: '/conversations/{id}/export' })
	.input(
		IdParamSchema.merge(
			z.object({
				format: z.enum(['json', 'markdown']).optional().default('json'),
				includeMetadata: z
					.union([z.boolean(), z.string().transform((v) => v === 'true')])
					.optional()
					.default(false),
			}),
		),
	)
	.output(
		z.union([
			ConversationExportSchema,
			z.object({
				markdown: z.string(),
				filename: z.string(),
			}),
		]),
	)
	.handler(async ({ input, context }) => {
		const { id: conversationId, format, includeMetadata } = input
		const { db } = context

		// Get conversation metadata
		const [conversation] = await db
			.select()
			.from(conversations)
			.where(eq(conversations.id, conversationId))

		if (!conversation) {
			notFound('Conversation not found')
		}

		// Get all messages including tool messages for full export
		const results = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))

		const exportedAt = new Date().toISOString()

		// Format based on requested format
		if (format === 'markdown') {
			const markdown = formatAsMarkdown({
				title: conversation.title || 'Untitled Conversation',
				messages: results.map((msg) => ({
					role: msg.role,
					content: msg.content,
					createdAt: msg.createdAt,
					metadata: includeMetadata ? (msg.metadata as Record<string, unknown> | null) : null,
				})),
				includeMetadata: Boolean(includeMetadata),
				exportedAt,
			})

			return {
				markdown,
				filename: `conversation-${conversationId}.md`,
			}
		}

		// JSON format (default)
		return {
			id: conversation.id,
			title: conversation.title || 'Untitled Conversation',
			agentId: conversation.agentId,
			createdAt: conversation.createdAt.toISOString(),
			updatedAt: conversation.updatedAt.toISOString(),
			messageCount: results.length,
			messages: results.map((msg) => ({
				id: msg.id,
				role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
				content: msg.content,
				createdAt: msg.createdAt.toISOString(),
				...(includeMetadata && msg.metadata ? { metadata: msg.metadata as Record<string, unknown> } : {}),
			})),
			exportedAt,
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const chatRouter = {
	chatWithAgent,
	listConversations,
	getMessages,
	exportConversation,
}
