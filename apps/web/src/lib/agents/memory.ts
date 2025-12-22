import type { Ai, VectorizeIndex } from '@cloudflare/workers-types'
import type { CoreMessage } from 'ai'
import { and, desc, eq, like } from 'drizzle-orm'
import { conversations, messages } from 'web-app/db/schema'
import type { Database, MessageMetadata } from 'web-app/db/types'
import { isMessageRole, type MessageRole } from 'web-app/lib/api/types'
import { generateEmbedding } from './providers/workers-ai'

export type { MessageRole }

/**
 * Conversation message structure.
 */
export interface ConversationMessage {
	id: string
	conversationId: string
	role: MessageRole
	content: string
	createdAt: Date
	metadata?: MessageMetadata
}

/**
 * Memory store interface for conversation history.
 */
export interface MemoryStore {
	saveMessage(
		conversationId: string,
		role: MessageRole,
		content: string,
		metadata?: MessageMetadata,
	): Promise<string>
	getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]>
	getOrCreateConversation(agentId: string, userId: string, title?: string): Promise<string>
	searchMessages(
		conversationId: string,
		query: string,
		limit?: number,
	): Promise<ConversationMessage[]>
	deleteConversation(conversationId: string): Promise<void>
}

/**
 * D1 + Vectorize memory store implementation.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class D1MemoryStore implements MemoryStore {
	constructor(
		private db: Database,
		private ai?: Ai,
		private vectorize?: VectorizeIndex,
		private workspaceId?: string,
	) {}

	/**
	 * Get or create a conversation for an agent and user.
	 */
	async getOrCreateConversation(agentId: string, userId: string, title?: string): Promise<string> {
		// Try to find existing conversation
		const existing = await this.db
			.select()
			.from(conversations)
			.where(and(eq(conversations.agentId, agentId), eq(conversations.userId, userId)))
			.orderBy(desc(conversations.updatedAt))
			.limit(1)

		const existingConversation = existing[0]
		if (existingConversation) {
			// Update the timestamp
			await this.db
				.update(conversations)
				.set({ updatedAt: new Date() })
				.where(eq(conversations.id, existingConversation.id))
			return existingConversation.id
		}

		// Create new conversation
		const newConversation = await this.db
			.insert(conversations)
			.values({
				agentId,
				userId,
				workspaceId: this.workspaceId || '',
				title: title || 'New Conversation',
			})
			.returning({ id: conversations.id })

		const created = newConversation[0]
		if (!created) {
			throw new Error('Failed to create conversation')
		}
		return created.id
	}

	/**
	 * Save a message to the conversation.
	 */
	async saveMessage(
		conversationId: string,
		role: MessageRole,
		content: string,
		metadata?: MessageMetadata,
	): Promise<string> {
		// Save to D1 using Drizzle
		const inserted = await this.db
			.insert(messages)
			.values({
				conversationId,
				role,
				content,
				metadata,
			})
			.returning({ id: messages.id })

		const insertedMessage = inserted[0]
		if (!insertedMessage) {
			throw new Error('Failed to save message')
		}
		const messageId = insertedMessage.id

		// Update conversation timestamp
		await this.db
			.update(conversations)
			.set({ updatedAt: new Date() })
			.where(eq(conversations.id, conversationId))

		// Save to Vectorize for semantic search (if available)
		if (this.vectorize && this.ai && role !== 'system' && role !== 'tool') {
			const embedding = await generateEmbedding(this.ai, content)

			await this.vectorize.insert([
				{
					id: messageId,
					values: embedding,
					namespace: this.workspaceId || 'default',
					metadata: {
						conversationId,
						role,
						createdAt: new Date().toISOString(),
					},
				},
			])
		}

		return messageId
	}

	/**
	 * Get messages for a conversation.
	 */
	async getMessages(conversationId: string, limit = 50): Promise<ConversationMessage[]> {
		const results = await this.db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(desc(messages.createdAt))
			.limit(limit)

		// Reverse to get chronological order and validate roles
		return results.reverse().map((row) => {
			if (!isMessageRole(row.role)) {
				throw new Error(`Invalid message role in database: ${row.role}`)
			}
			return {
				id: row.id,
				conversationId: row.conversationId,
				role: row.role,
				content: row.content,
				createdAt: row.createdAt,
				metadata: row.metadata ?? undefined,
			}
		})
	}

	/**
	 * Search messages using semantic search or text fallback.
	 */
	async searchMessages(
		conversationId: string,
		query: string,
		limit = 10,
	): Promise<ConversationMessage[]> {
		// Helper to convert DB row to ConversationMessage with validation
		const toConversationMessage = (row: typeof messages.$inferSelect): ConversationMessage => {
			if (!isMessageRole(row.role)) {
				throw new Error(`Invalid message role in database: ${row.role}`)
			}
			return {
				id: row.id,
				conversationId: row.conversationId,
				role: row.role,
				content: row.content,
				createdAt: row.createdAt,
				metadata: row.metadata ?? undefined,
			}
		}

		// Try semantic search with Vectorize
		if (this.vectorize && this.ai) {
			const queryEmbedding = await generateEmbedding(this.ai, query)

			const results = await this.vectorize.query(queryEmbedding, {
				topK: limit,
				namespace: this.workspaceId || 'default',
				filter: { conversationId },
				returnMetadata: 'all',
			})

			if (results.matches.length > 0) {
				// Fetch full messages from D1 using the IDs
				const messageIds = results.matches.map((match) => match.id)
				const messagesResult = await this.db.select().from(messages).where(eq(messages.conversationId, conversationId))

				// Filter to matching IDs and sort by score
				const matchedMessages = messagesResult.filter((m) => messageIds.includes(m.id))

				return matchedMessages.map(toConversationMessage)
			}
		}

		// Fallback to basic text search in D1
		const results = await this.db
			.select()
			.from(messages)
			.where(and(eq(messages.conversationId, conversationId), like(messages.content, `%${query}%`)))
			.orderBy(desc(messages.createdAt))
			.limit(limit)

		return results.map(toConversationMessage)
	}

	/**
	 * Delete a conversation and all its messages.
	 */
	async deleteConversation(conversationId: string): Promise<void> {
		// Get message IDs for Vectorize cleanup
		const messageRows = await this.db
			.select({ id: messages.id })
			.from(messages)
			.where(eq(messages.conversationId, conversationId))

		// Delete from D1 (cascade will delete messages)
		await this.db.delete(conversations).where(eq(conversations.id, conversationId))

		// Delete from Vectorize
		if (this.vectorize && messageRows.length > 0) {
			const ids = messageRows.map((m) => m.id)
			await this.vectorize.deleteByIds(ids)
		}
	}
}

/**
 * Create a memory store instance.
 */
export function createMemoryStore(
	db: Database,
	ai?: Ai,
	vectorize?: VectorizeIndex,
	workspaceId?: string,
): MemoryStore {
	return new D1MemoryStore(db, ai, vectorize, workspaceId)
}

/**
 * Convert conversation messages to the format expected by AI SDK agents.
 */
export function toAgentMessages(messages: ConversationMessage[]): CoreMessage[] {
	return messages
		.filter((m) => m.role !== 'tool') // Filter out tool messages
		.map((m) => ({
			role: m.role as 'user' | 'assistant' | 'system',
			content: m.content,
		}))
}
