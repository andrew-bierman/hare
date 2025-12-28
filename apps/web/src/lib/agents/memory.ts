import { isMessageRole, type MessageRole } from '@hare/api'
import type { CoreMessage } from 'ai'
import { and, desc, eq, like } from 'drizzle-orm'
import { conversations, messages } from 'web-app/db/schema'
import type { Database, MessageMetadata } from 'web-app/db/types'

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
 * Input for saving a message.
 */
export interface SaveMessageInput {
	conversationId: string
	role: MessageRole
	content: string
	metadata?: MessageMetadata
}

/**
 * Input for getting messages.
 */
export interface GetMessagesInput {
	conversationId: string
	limit?: number
}

/**
 * Input for getting or creating a conversation.
 */
export interface GetOrCreateConversationInput {
	agentId: string
	userId: string
	title?: string
}

/**
 * Input for searching messages.
 */
export interface SearchMessagesInput {
	conversationId: string
	query: string
	limit?: number
}

/**
 * Memory store interface for conversation history.
 */
export interface MemoryStore {
	saveMessage(input: SaveMessageInput): Promise<string>
	getMessages(input: GetMessagesInput): Promise<ConversationMessage[]>
	getOrCreateConversation(input: GetOrCreateConversationInput): Promise<string>
	searchMessages(input: SearchMessagesInput): Promise<ConversationMessage[]>
	deleteConversation(conversationId: string): Promise<void>
}

/**
 * D1 memory store implementation.
 * Uses Drizzle ORM for type-safe database operations.
 */
export class D1MemoryStore implements MemoryStore {
	constructor(
		private db: Database,
		private workspaceId?: string,
	) {}

	/**
	 * Get or create a conversation for an agent and user.
	 */
	async getOrCreateConversation(input: GetOrCreateConversationInput): Promise<string> {
		const { agentId, userId, title } = input
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
	async saveMessage(input: SaveMessageInput): Promise<string> {
		const { conversationId, role, content, metadata } = input
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

		return messageId
	}

	/**
	 * Get messages for a conversation.
	 */
	async getMessages(input: GetMessagesInput): Promise<ConversationMessage[]> {
		const { conversationId, limit = 50 } = input
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
	 * Search messages using text search.
	 */
	async searchMessages(input: SearchMessagesInput): Promise<ConversationMessage[]> {
		const { conversationId, query, limit = 10 } = input
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

		// Text search in D1
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
		// Delete from D1 (cascade will delete messages)
		await this.db.delete(conversations).where(eq(conversations.id, conversationId))
	}
}

/**
 * Create a memory store instance.
 */
export function createMemoryStore(db: Database, workspaceId?: string): MemoryStore {
	return new D1MemoryStore(db, workspaceId)
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
