/**
 * oRPC Chat Router
 *
 * Handles chat operations including streaming responses, conversations, and exports.
 */

import {
	type AgentConfig,
	createAgentFromConfig,
	createMemoryStore,
	toAgentMessages,
} from '@hare/agent'
import { recordUsage } from '@hare/db'
import { agents, conversations, messages } from '@hare/db/schema'
import { eventIterator } from '@orpc/server'
import { type ModelMessage, streamText } from 'ai'
import { and, count, desc, eq, gte, like, lte } from 'drizzle-orm'
import { z } from 'zod'
import {
	ChatRequestSchema,
	ConversationExportSchema,
	ConversationSchema,
	ConversationSearchQuerySchema,
	ConversationSearchResponseSchema,
	IdParamSchema,
	MessageSchema,
} from '../../schemas'
import { authedProcedure, notFound } from '../base'

// =============================================================================
// Export Helpers
// =============================================================================

/**
 * Escape a value for CSV format.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsvValue(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

/**
 * Convert conversation messages to CSV format.
 * Columns: timestamp, role, content
 */
function formatAsCsv(options: {
	messages: Array<{
		role: string
		content: string
		createdAt: Date
	}>
}): string {
	const { messages } = options

	const lines: string[] = ['timestamp,role,content']

	for (const msg of messages) {
		const timestamp = msg.createdAt.toISOString()
		const role = msg.role
		const content = escapeCsvValue(msg.content)
		lines.push(`${timestamp},${role},${content}`)
	}

	return lines.join('\n')
}

/**
 * Convert conversation messages to plain text format.
 * Human-readable format with clear message separation.
 */
function formatAsTxt(options: {
	title: string
	messages: Array<{
		role: string
		content: string
		createdAt: Date
	}>
	exportedAt: string
}): string {
	const { title, messages, exportedAt } = options

	const lines: string[] = [
		title,
		'='.repeat(title.length),
		'',
		`Exported: ${exportedAt}`,
		'',
		'-'.repeat(50),
		'',
	]

	for (const msg of messages) {
		const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1)
		const timestamp = msg.createdAt.toISOString()

		lines.push(`[${roleLabel}] ${timestamp}`)
		lines.push('')
		lines.push(msg.content)
		lines.push('')
		lines.push('-'.repeat(50))
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

			// Get actual token usage from AI SDK and record non-blocking
			const latencyMs = Date.now() - startTime
			const tokenUsage = await result.usage

			// Register background task BEFORE yielding done to avoid generator abort race
			context.executionCtx.waitUntil(
				recordUsage({
					db,
					workspaceId: agentConfig.workspaceId,
					agentId,
					userId: user.id,
					type: 'chat',
					usage: tokenUsage,
					metadata: { model: agentConfig.model, duration: latencyMs },
				}),
			)

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
 * Export a conversation in JSON, CSV, or TXT format.
 */
export const exportConversation = authedProcedure
	.route({ method: 'GET', path: '/conversations/{id}/export' })
	.input(
		IdParamSchema.merge(
			z.object({
				format: z.enum(['json', 'csv', 'txt']).optional().default('json'),
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
				csv: z.string(),
				filename: z.string(),
			}),
			z.object({
				txt: z.string(),
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
		const title = conversation.title || 'Untitled Conversation'

		// Format based on requested format
		if (format === 'csv') {
			const csv = formatAsCsv({
				messages: results.map((msg) => ({
					role: msg.role,
					content: msg.content,
					createdAt: msg.createdAt,
				})),
			})

			return {
				csv,
				filename: `conversation-${conversationId}.csv`,
			}
		}

		if (format === 'txt') {
			const txt = formatAsTxt({
				title,
				messages: results.map((msg) => ({
					role: msg.role,
					content: msg.content,
					createdAt: msg.createdAt,
				})),
				exportedAt,
			})

			return {
				txt,
				filename: `conversation-${conversationId}.txt`,
			}
		}

		// JSON format (default) - includes full metadata and tool calls
		return {
			id: conversation.id,
			title,
			agentId: conversation.agentId,
			createdAt: conversation.createdAt.toISOString(),
			updatedAt: conversation.updatedAt.toISOString(),
			messageCount: results.length,
			messages: results.map((msg) => ({
				id: msg.id,
				role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
				content: msg.content,
				createdAt: msg.createdAt.toISOString(),
				...(includeMetadata && msg.metadata
					? { metadata: msg.metadata as Record<string, unknown> }
					: {}),
			})),
			exportedAt,
		}
	})

// =============================================================================
// Search Helpers
// =============================================================================

/**
 * Highlight matching text in content using <mark> tags.
 * Returns a snippet around the first match with context.
 */
function highlightMatch(options: {
	content: string
	query: string
	contextChars?: number
}): string {
	const { content, query, contextChars = 100 } = options

	// Escape special regex characters in the query
	const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const regex = new RegExp(`(${escapedQuery})`, 'gi')

	// Find the first match position
	const match = regex.exec(content)
	if (!match) {
		// No match found, return truncated content
		return content.length > contextChars * 2
			? `${content.substring(0, contextChars * 2)}...`
			: content
	}

	const matchStart = match.index
	const matchEnd = matchStart + match[0].length

	// Calculate snippet boundaries
	let snippetStart = Math.max(0, matchStart - contextChars)
	let snippetEnd = Math.min(content.length, matchEnd + contextChars)

	// Adjust to word boundaries if possible
	if (snippetStart > 0) {
		const spaceIndex = content.indexOf(' ', snippetStart)
		if (spaceIndex !== -1 && spaceIndex < matchStart) {
			snippetStart = spaceIndex + 1
		}
	}
	if (snippetEnd < content.length) {
		const spaceIndex = content.lastIndexOf(' ', snippetEnd)
		if (spaceIndex !== -1 && spaceIndex > matchEnd) {
			snippetEnd = spaceIndex
		}
	}

	// Extract snippet and add ellipses
	let snippet = content.substring(snippetStart, snippetEnd)
	if (snippetStart > 0) {
		snippet = `...${snippet}`
	}
	if (snippetEnd < content.length) {
		snippet = `${snippet}...`
	}

	// Highlight all matches in the snippet
	return snippet.replace(regex, '<mark>$1</mark>')
}

// =============================================================================
// Search Procedure
// =============================================================================

/**
 * Search conversations for an agent.
 * Full-text search on message content with date filtering.
 */
export const searchConversations = authedProcedure
	.route({ method: 'GET', path: '/agents/{id}/conversations/search' })
	.input(IdParamSchema.merge(ConversationSearchQuerySchema))
	.output(ConversationSearchResponseSchema)
	.handler(async ({ input, context }) => {
		const { id: agentId, query, dateFrom, dateTo, limit, offset } = input
		const { db } = context

		// Build filter conditions for messages
		const conditions = [eq(conversations.agentId, agentId), like(messages.content, `%${query}%`)]

		if (dateFrom) {
			const fromDate = new Date(dateFrom)
			conditions.push(gte(messages.createdAt, fromDate))
		}

		if (dateTo) {
			const toDate = new Date(dateTo)
			conditions.push(lte(messages.createdAt, toDate))
		}

		const whereClause = and(...conditions)

		// Get total count for pagination
		const [countResult] = await db
			.select({ total: count() })
			.from(messages)
			.innerJoin(conversations, eq(messages.conversationId, conversations.id))
			.where(whereClause)

		const total = countResult?.total ?? 0

		// Get paginated results with conversation context
		const results = await db
			.select({
				messageId: messages.id,
				conversationId: messages.conversationId,
				conversationTitle: conversations.title,
				role: messages.role,
				content: messages.content,
				createdAt: messages.createdAt,
			})
			.from(messages)
			.innerJoin(conversations, eq(messages.conversationId, conversations.id))
			.where(whereClause)
			.orderBy(desc(messages.createdAt))
			.limit(limit)
			.offset(offset)

		return {
			results: results
				.filter((msg) => msg.role !== 'tool')
				.map((msg) => ({
					messageId: msg.messageId,
					conversationId: msg.conversationId,
					conversationTitle: msg.conversationTitle,
					role: msg.role as 'user' | 'assistant' | 'system',
					content: msg.content,
					highlightedContent: highlightMatch({ content: msg.content, query }),
					createdAt: msg.createdAt.toISOString(),
				})),
			total,
			limit,
			offset,
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
	searchConversations,
}
