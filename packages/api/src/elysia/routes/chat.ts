/**
 * Chat Routes
 *
 * Chat with agents (streaming), conversations, messages, export, and search.
 */

import {
	type AgentConfig,
	createAgentFromConfig,
	createMemoryStore,
	toAgentMessages,
} from '@hare/agent'
import { getErrorMessage } from '@hare/checks'
import { config } from '@hare/config'
import { agents, conversations, messages, usage, workspaceMembers, workspaces } from '@hare/db/schema'
import { type ModelMessage, streamText } from 'ai'
import { and, count, desc, eq, gte, like, lte, or } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import type { z } from 'zod'
import type { ChatRequestSchema } from '../../schemas'
import { deductCredits, hasCredits } from '../../services/credits'
import { authPlugin } from '../context'

// =============================================================================
// Export Helpers
// =============================================================================

function escapeCsvValue(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

function formatAsCsv(options: {
	messages: Array<{ role: string; content: string; createdAt: Date }>
}): string {
	const { messages: msgs } = options
	const lines: string[] = ['timestamp,role,content']
	for (const msg of msgs) {
		const timestamp = msg.createdAt.toISOString()
		const role = msg.role
		const content = escapeCsvValue(msg.content)
		lines.push(`${timestamp},${role},${content}`)
	}
	return lines.join('\n')
}

function formatAsTxt(options: {
	title: string
	messages: Array<{ role: string; content: string; createdAt: Date }>
	exportedAt: string
}): string {
	const { title, messages: msgs, exportedAt } = options
	const lines: string[] = [
		title,
		'='.repeat(title.length),
		'',
		`Exported: ${exportedAt}`,
		'',
		'-'.repeat(50),
		'',
	]

	for (const msg of msgs) {
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
// Search Helpers
// =============================================================================

function highlightMatch(options: {
	content: string
	query: string
	contextChars?: number
}): string {
	const { content, query, contextChars = 100 } = options
	const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const regex = new RegExp(`(${escapedQuery})`, 'gi')

	const match = regex.exec(content)
	if (!match) {
		return content.length > contextChars * 2
			? `${content.substring(0, contextChars * 2)}...`
			: content
	}

	const matchStart = match.index
	const matchEnd = matchStart + match[0].length

	let snippetStart = Math.max(0, matchStart - contextChars)
	let snippetEnd = Math.min(content.length, matchEnd + contextChars)

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

	let snippet = content.substring(snippetStart, snippetEnd)
	if (snippetStart > 0) snippet = `...${snippet}`
	if (snippetEnd < content.length) snippet = `${snippet}...`

	return snippet.replace(regex, '<mark>$1</mark>')
}

// =============================================================================
// Auth Helpers
// =============================================================================

import type { Database } from '@hare/db'

/**
 * Verify that `userId` is a member or owner of `workspaceId`.
 * Returns true if access is granted.
 */
async function userHasWorkspaceAccess(options: {
	db: Database
	userId: string
	workspaceId: string
}): Promise<boolean> {
	const { db, userId, workspaceId } = options
	const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
	if (!ws) return false
	if (ws.ownerId === userId) return true
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(
			and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
		)
	return !!membership
}

// =============================================================================
// Routes
// =============================================================================

export const chatRoutes = new Elysia({ prefix: '/chat', name: 'chat-routes' })
	.use(authPlugin)

	// Chat with agent (streaming SSE response)
	.post(
		'/agents/:id/chat',
		async ({ db, cfEnv, user, params, request }) => {
			let body: z.infer<typeof ChatRequestSchema>
			try {
				body = await request.json()
			} catch {
				return status(400, { error: 'Invalid JSON body' })
			}

			const agentId = params.id
			const { message, sessionId, metadata } = body

			if (!cfEnv.AI) {
				return status(503, { error: 'AI service not available' })
			}

			const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))
			if (!agentConfig) return status(404, { error: 'Agent not found' })
			if (agentConfig.status !== config.enums.agentStatus.DEPLOYED)
				return status(400, { error: 'Agent not deployed' })

			// Verify caller belongs to the agent's workspace
			const hasAccess = await userHasWorkspaceAccess({
				db,
				userId: user.id,
				workspaceId: agentConfig.workspaceId,
			})
			if (!hasAccess) return status(403, { error: 'Access denied' })

			// Check credits balance before processing
			const canProceed = await hasCredits({ db, workspaceId: agentConfig.workspaceId })
			if (!canProceed)
				return status(402, {
					error: 'No credits remaining. Buy more credits to continue using your agents.',
				})

			// Build SSE stream
			const encoder = new TextEncoder()
			const stream = new ReadableStream({
				start: async (controller) => {
					const sendEvent = (data: Record<string, unknown>) => {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
					}

					try {
						const memory = createMemoryStore(db, agentConfig.workspaceId)
						const conversationId =
							sessionId ||
							(await memory.getOrCreateConversation({
								agentId,
								userId: user.id,
								title: `Chat with ${agentConfig.name}`,
							}))

						const agent = await createAgentFromConfig({
							agentConfig: agentConfig as AgentConfig,
							db,
							env: cfEnv,
							userId: user.id,
							includeSystemTools: true,
						})

						const historyMessages = await memory.getMessages({
							conversationId,
							limit: 20,
						})
						const agentMessages: ModelMessage[] = toAgentMessages(historyMessages)
						agentMessages.push({ role: 'user' as const, content: message })

						await memory.saveMessage({
							conversationId,
							role: 'user',
							content: message,
							metadata: metadata as Record<string, unknown>,
						})

						const startTime = Date.now()
						let fullResponse = ''

						const result = streamText({
							model: agent.model,
							messages: [{ role: 'system', content: agent.instructions }, ...agentMessages],
						})

						for await (const chunk of result.textStream) {
							fullResponse += chunk
							sendEvent({ type: 'text', content: chunk })
						}

						await memory.saveMessage({
							conversationId,
							role: 'assistant',
							content: fullResponse,
							metadata: { model: agentConfig.model, agentId },
						})

						const latencyMs = Date.now() - startTime
						const tokenUsage = await result.usage
						const tokensIn = tokenUsage.inputTokens ?? 0
						const tokensOut = tokenUsage.outputTokens ?? 0

						await db.insert(usage).values({
							workspaceId: agentConfig.workspaceId,
							agentId,
							userId: user.id,
							type: 'chat',
							inputTokens: tokensIn,
							outputTokens: tokensOut,
							totalTokens: tokensIn + tokensOut,
							metadata: { model: agentConfig.model, duration: latencyMs },
						})

						// Deduct tokens used from credits balance (skip if provider didn't report usage)
						if (tokensIn + tokensOut > 0) {
							await deductCredits({
								db,
								workspaceId: agentConfig.workspaceId,
								amount: tokensIn + tokensOut,
							})
						}

						sendEvent({ type: 'done', sessionId: conversationId })
					} catch (err) {
						// biome-ignore lint/suspicious/noConsole: error reporting
						console.error('Error during chat streaming:', err)
						sendEvent({
							type: 'error',
							message: getErrorMessage(err),
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
		},
		{ auth: true },
	)

	// List conversations for an agent
	.get(
		'/agents/:id/conversations',
		async ({ db, user, params }) => {
			const agentId = params.id
			const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))
			if (!agentConfig) return status(404, { error: 'Agent not found' })
			const hasAccess = await userHasWorkspaceAccess({
				db,
				userId: user.id,
				workspaceId: agentConfig.workspaceId,
			})
			if (!hasAccess) return status(403, { error: 'Access denied' })

			const results = await db
				.select({
					id: conversations.id,
					agentId: conversations.agentId,
					userId: conversations.userId,
					title: conversations.title,
					createdAt: conversations.createdAt,
					updatedAt: conversations.updatedAt,
					messageCount: count(messages.id),
				})
				.from(conversations)
				.leftJoin(messages, eq(messages.conversationId, conversations.id))
				.where(eq(conversations.agentId, agentId))
				.groupBy(conversations.id)

			return {
				conversations: results.map((conv) => ({
					id: conv.id,
					agentId: conv.agentId,
					userId: conv.userId,
					title: conv.title || 'Untitled Conversation',
					messageCount: conv.messageCount,
					createdAt: conv.createdAt.toISOString(),
					updatedAt: conv.updatedAt.toISOString(),
				})),
			}
		},
		{ auth: true },
	)

	// Search conversations for an agent
	.get(
		'/agents/:id/conversations/search',
		async ({ db, user, params, query }) => {
			const agentId = params.id
			const [agentConfig] = await db.select().from(agents).where(eq(agents.id, agentId))
			if (!agentConfig) return status(404, { error: 'Agent not found' })
			const hasAccess = await userHasWorkspaceAccess({
				db,
				userId: user.id,
				workspaceId: agentConfig.workspaceId,
			})
			if (!hasAccess) return status(403, { error: 'Access denied' })

			const searchQuery = (query?.query as string) || ''
			const dateFrom = query?.dateFrom as string | undefined
			const dateTo = query?.dateTo as string | undefined
			const limit = Number(query?.limit) || 20
			const offset = Number(query?.offset) || 0

			const conditions = [
				eq(conversations.agentId, agentId),
				like(messages.content, `%${searchQuery}%`),
			]

			if (dateFrom) {
				conditions.push(gte(messages.createdAt, new Date(dateFrom)))
			}
			if (dateTo) {
				conditions.push(lte(messages.createdAt, new Date(dateTo)))
			}

			const whereClause = and(...conditions)

			const [countResult] = await db
				.select({ total: count() })
				.from(messages)
				.innerJoin(conversations, eq(messages.conversationId, conversations.id))
				.where(whereClause)

			const total = countResult?.total ?? 0

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
						highlightedContent: highlightMatch({ content: msg.content, query: searchQuery }),
						createdAt: msg.createdAt.toISOString(),
					})),
				total,
				limit,
				offset,
			}
		},
		{ auth: true },
	)

	// Get messages in a conversation
	.get(
		'/conversations/:id/messages',
		async ({ db, user, params }) => {
			const conversationId = params.id

			// Verify conversation exists and belongs to caller's workspace
			const [conversation] = await db
				.select()
				.from(conversations)
				.where(eq(conversations.id, conversationId))
			if (!conversation) return status(404, { error: 'Conversation not found' })

			const [agentConfig] = await db
				.select()
				.from(agents)
				.where(eq(agents.id, conversation.agentId))
			const workspaceId = agentConfig?.workspaceId
			if (!workspaceId) return status(404, { error: 'Conversation not found' })

			const hasAccess = await userHasWorkspaceAccess({ db, userId: user.id, workspaceId })
			if (!hasAccess) return status(403, { error: 'Access denied' })

			const results = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, conversationId))

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
		},
		{ auth: true },
	)

	// Export conversation
	.get(
		'/conversations/:id/export',
		async ({ db, user, params, query }) => {
			const conversationId = params.id
			const format = (query?.format as 'json' | 'csv' | 'txt') || 'json'
			const includeMetadata = query?.includeMetadata === 'true'

			const [conversation] = await db
				.select()
				.from(conversations)
				.where(eq(conversations.id, conversationId))

			if (!conversation) return status(404, { error: 'Conversation not found' })

			// Verify caller has access to this conversation's workspace
			const [agentConfig] = await db
				.select()
				.from(agents)
				.where(eq(agents.id, conversation.agentId))
			const workspaceId = agentConfig?.workspaceId
			if (!workspaceId) return status(404, { error: 'Conversation not found' })

			const hasAccess = await userHasWorkspaceAccess({ db, userId: user.id, workspaceId })
			if (!hasAccess) return status(403, { error: 'Access denied' })

			const results = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, conversationId))

			const exportedAt = new Date().toISOString()
			const title = conversation.title || 'Untitled Conversation'

			if (format === 'csv') {
				const csv = formatAsCsv({
					messages: results.map((msg) => ({
						role: msg.role,
						content: msg.content,
						createdAt: msg.createdAt,
					})),
				})
				return { csv, filename: `conversation-${conversationId}.csv` }
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
				return { txt, filename: `conversation-${conversationId}.txt` }
			}

			// JSON format (default)
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
		},
		{ auth: true },
	)
