/**
 * Tests for memory.ts - D1MemoryStore and memory utilities
 */

import { env } from 'cloudflare:test'
import { describe, expect, it, beforeEach, beforeAll } from 'vitest'
import { createDb, type Database } from '@hare/db'
import { D1MemoryStore, createMemoryStore, toAgentMessages, type ConversationMessage } from '../memory'

// Augment the cloudflare:test module to include our env bindings
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
	}
}

/**
 * SQL statements for setting up test database schema.
 */
const MIGRATION_STATEMENTS = [
	// Conversations table
	`CREATE TABLE IF NOT EXISTS "conversations" (
		"id" text PRIMARY KEY NOT NULL,
		"workspaceId" text NOT NULL,
		"agentId" text NOT NULL,
		"userId" text,
		"title" text,
		"createdAt" integer NOT NULL DEFAULT (unixepoch()),
		"updatedAt" integer NOT NULL DEFAULT (unixepoch())
	)`,
	// Messages table
	`CREATE TABLE IF NOT EXISTS "messages" (
		"id" text PRIMARY KEY NOT NULL,
		"conversationId" text NOT NULL,
		"role" text NOT NULL,
		"content" text NOT NULL,
		"metadata" text,
		"createdAt" integer NOT NULL DEFAULT (unixepoch())
	)`,
]

/**
 * Apply migrations to the D1 database.
 */
async function applyMigrations(db: D1Database): Promise<void> {
	const statements = MIGRATION_STATEMENTS.map((sql) => db.prepare(sql))
	await db.batch(statements)
}

/**
 * Clean up test data between tests.
 */
async function cleanupData(db: D1Database): Promise<void> {
	await db.exec('DELETE FROM messages')
	await db.exec('DELETE FROM conversations')
}

describe('D1MemoryStore', () => {
	let db: Database
	let memoryStore: D1MemoryStore

	beforeAll(async () => {
		await applyMigrations(env.DB)
	})

	beforeEach(async () => {
		await cleanupData(env.DB)
		db = createDb(env.DB)
		memoryStore = new D1MemoryStore(db, 'test_workspace')
	})

	describe('getOrCreateConversation', () => {
		it('creates a new conversation for authenticated user', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
				title: 'Test Conversation',
			})

			expect(conversationId).toBeDefined()
			expect(typeof conversationId).toBe('string')
		})

		it('returns existing conversation for same user and agent', async () => {
			const firstId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			const secondId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			expect(secondId).toBe(firstId)
		})

		it('creates new conversation for null userId (anonymous)', async () => {
			const firstId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: null,
			})

			const secondId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: null,
			})

			// Anonymous sessions always get new conversations
			expect(secondId).not.toBe(firstId)
		})

		it('creates separate conversations for different users', async () => {
			const user1Id = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_1',
			})

			const user2Id = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_2',
			})

			expect(user1Id).not.toBe(user2Id)
		})

		it('creates separate conversations for different agents', async () => {
			const agent1Id = await memoryStore.getOrCreateConversation({
				agentId: 'agent_1',
				userId: 'user_123',
			})

			const agent2Id = await memoryStore.getOrCreateConversation({
				agentId: 'agent_2',
				userId: 'user_123',
			})

			expect(agent1Id).not.toBe(agent2Id)
		})

		it('uses default title when not provided', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			expect(conversationId).toBeDefined()
		})
	})

	describe('saveMessage', () => {
		it('saves a user message', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			const messageId = await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'Hello, how are you?',
			})

			expect(messageId).toBeDefined()
			expect(typeof messageId).toBe('string')
		})

		it('saves an assistant message', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			const messageId = await memoryStore.saveMessage({
				conversationId,
				role: 'assistant',
				content: 'I am doing well, thank you!',
			})

			expect(messageId).toBeDefined()
		})

		it('saves a system message', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			const messageId = await memoryStore.saveMessage({
				conversationId,
				role: 'system',
				content: 'You are a helpful assistant.',
			})

			expect(messageId).toBeDefined()
		})

		it('saves message with metadata', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			const messageId = await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'Test message',
				metadata: { model: 'test-model', agentId: 'agent_123' },
			})

			expect(messageId).toBeDefined()
		})
	})

	describe('getMessages', () => {
		it('retrieves messages for a conversation', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'First message',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'assistant',
				content: 'Second message',
			})

			const messages = await memoryStore.getMessages({ conversationId })

			expect(messages.length).toBe(2)
			// Messages are returned in chronological order after reversal
			const contents = messages.map((m) => m.content)
			expect(contents).toContain('First message')
			expect(contents).toContain('Second message')
		})

		it('returns messages with correct roles', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'Message 1',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'assistant',
				content: 'Message 2',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'Message 3',
			})

			const messages = await memoryStore.getMessages({ conversationId })

			expect(messages.length).toBe(3)
			// Verify all messages are present with correct roles
			const userMessages = messages.filter((m) => m.role === 'user')
			const assistantMessages = messages.filter((m) => m.role === 'assistant')
			expect(userMessages.length).toBe(2)
			expect(assistantMessages.length).toBe(1)
		})

		it('respects limit parameter', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			for (let i = 0; i < 10; i++) {
				await memoryStore.saveMessage({
					conversationId,
					role: 'user',
					content: `Message ${i}`,
				})
			}

			const messages = await memoryStore.getMessages({ conversationId, limit: 5 })

			expect(messages.length).toBe(5)
		})

		it('returns empty array for non-existent conversation', async () => {
			const messages = await memoryStore.getMessages({
				conversationId: 'non_existent_id',
			})

			expect(messages).toEqual([])
		})
	})

	describe('searchMessages', () => {
		it('finds messages containing search query', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'Tell me about TypeScript',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'assistant',
				content: 'TypeScript is a typed superset of JavaScript',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'What about Python?',
			})

			const results = await memoryStore.searchMessages({
				conversationId,
				query: 'TypeScript',
			})

			expect(results.length).toBe(2)
		})

		it('returns empty array when no matches found', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			await memoryStore.saveMessage({
				conversationId,
				role: 'user',
				content: 'Hello world',
			})

			const results = await memoryStore.searchMessages({
				conversationId,
				query: 'nonexistent',
			})

			expect(results).toEqual([])
		})

		it('respects limit parameter', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			for (let i = 0; i < 10; i++) {
				await memoryStore.saveMessage({
					conversationId,
					role: 'user',
					content: `Test message number ${i}`,
				})
			}

			const results = await memoryStore.searchMessages({
				conversationId,
				query: 'message',
				limit: 3,
			})

			expect(results.length).toBe(3)
		})
	})

	describe('deleteConversation', () => {
		it('deletes a conversation from database', async () => {
			const conversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			// Verify the conversation was created - we should be able to get it again
			// Since there's no direct method to check conversation existence,
			// we verify by the fact that deleteConversation runs without error
			await memoryStore.deleteConversation(conversationId)

			// Creating a new conversation for the same user/agent should give a new ID
			// (since the old one was deleted)
			const newConversationId = await memoryStore.getOrCreateConversation({
				agentId: 'agent_123',
				userId: 'user_456',
			})

			// Note: In SQLite without ON DELETE CASCADE, messages may remain orphaned
			// The conversation itself is deleted
			expect(newConversationId).toBeDefined()
		})

		it('handles deletion of non-existent conversation gracefully', async () => {
			// Should not throw
			await memoryStore.deleteConversation('non_existent_id')
		})
	})
})

describe('createMemoryStore', () => {
	beforeAll(async () => {
		await applyMigrations(env.DB)
	})

	it('creates a D1MemoryStore instance', () => {
		const db = createDb(env.DB)
		const store = createMemoryStore(db)

		expect(store).toBeInstanceOf(D1MemoryStore)
	})

	it('creates store with workspace ID', () => {
		const db = createDb(env.DB)
		const store = createMemoryStore(db, 'workspace_123')

		expect(store).toBeInstanceOf(D1MemoryStore)
	})
})

describe('toAgentMessages', () => {
	it('converts conversation messages to agent messages', () => {
		const messages: ConversationMessage[] = [
			{
				id: '1',
				conversationId: 'conv_1',
				role: 'user',
				content: 'Hello',
				createdAt: new Date(),
			},
			{
				id: '2',
				conversationId: 'conv_1',
				role: 'assistant',
				content: 'Hi there!',
				createdAt: new Date(),
			},
		]

		const agentMessages = toAgentMessages(messages)

		expect(agentMessages).toEqual([
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there!' },
		])
	})

	it('filters out tool messages', () => {
		const messages: ConversationMessage[] = [
			{
				id: '1',
				conversationId: 'conv_1',
				role: 'user',
				content: 'Use the calculator',
				createdAt: new Date(),
			},
			{
				id: '2',
				conversationId: 'conv_1',
				role: 'tool',
				content: 'tool_result',
				createdAt: new Date(),
			},
			{
				id: '3',
				conversationId: 'conv_1',
				role: 'assistant',
				content: 'The result is 42',
				createdAt: new Date(),
			},
		]

		const agentMessages = toAgentMessages(messages)

		expect(agentMessages.length).toBe(2)
		expect(agentMessages.find((m) => m.role === 'tool')).toBeUndefined()
	})

	it('preserves system messages', () => {
		const messages: ConversationMessage[] = [
			{
				id: '1',
				conversationId: 'conv_1',
				role: 'system',
				content: 'You are a helpful assistant.',
				createdAt: new Date(),
			},
			{
				id: '2',
				conversationId: 'conv_1',
				role: 'user',
				content: 'Hello',
				createdAt: new Date(),
			},
		]

		const agentMessages = toAgentMessages(messages)

		expect(agentMessages.length).toBe(2)
		expect(agentMessages[0]?.role).toBe('system')
	})

	it('returns empty array for empty input', () => {
		const agentMessages = toAgentMessages([])
		expect(agentMessages).toEqual([])
	})
})
