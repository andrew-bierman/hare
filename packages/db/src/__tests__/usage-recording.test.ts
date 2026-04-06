/**
 * Integration tests for the recordUsage helper.
 */

import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '../schema'
import { recordUsage } from '../usage-recording'

declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
		TEST_MIGRATIONS: D1Migration[]
	}
}

const db = drizzle(env.DB, { schema })

const TEST_WORKSPACE_ID = 'ws_test_usage_recording'
const TEST_USER_ID = 'user_test_usage_recording'
const TEST_AGENT_ID = 'agent_test_usage_recording'

async function seedRequired() {
	await db.insert(schema.users).values({
		id: TEST_USER_ID,
		name: 'Test User',
		email: 'usage-recording-test@example.com',
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
	await db.insert(schema.workspaces).values({
		id: TEST_WORKSPACE_ID,
		name: 'Test Workspace',
		slug: 'test-usage-recording',
		ownerId: TEST_USER_ID,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
	await db.insert(schema.agents).values({
		id: TEST_AGENT_ID,
		workspaceId: TEST_WORKSPACE_ID,
		name: 'Test Agent',
		model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		status: 'deployed',
		createdBy: TEST_USER_ID,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
}

async function cleanup() {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM usage'),
		env.DB.prepare('DELETE FROM agents'),
		env.DB.prepare('DELETE FROM workspaces'),
		env.DB.prepare('DELETE FROM "user"'),
	])
}

describe('recordUsage', () => {
	beforeEach(async () => {
		await cleanup()
		await seedRequired()
	})

	afterEach(async () => {
		await cleanup()
	})

	it('should insert a usage record with correct fields', async () => {
		await recordUsage({
			db,
			workspaceId: TEST_WORKSPACE_ID,
			agentId: TEST_AGENT_ID,
			userId: TEST_USER_ID,
			type: 'chat',
			usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
			metadata: { model: 'llama-3.3', duration: 500 },
		})

		const records = await db
			.select()
			.from(schema.usage)
			.where(eq(schema.usage.workspaceId, TEST_WORKSPACE_ID))
		expect(records).toHaveLength(1)
		expect(records[0].inputTokens).toBe(100)
		expect(records[0].outputTokens).toBe(200)
		expect(records[0].totalTokens).toBe(300)
		expect(records[0].type).toBe('chat')
	})

	it('should compute totalTokens internally from input + output', async () => {
		await recordUsage({
			db,
			workspaceId: TEST_WORKSPACE_ID,
			agentId: TEST_AGENT_ID,
			userId: null,
			type: 'embed',
			usage: { inputTokens: 50, outputTokens: 75, totalTokens: 999 },
		})

		const records = await db
			.select()
			.from(schema.usage)
			.where(eq(schema.usage.workspaceId, TEST_WORKSPACE_ID))
		// totalTokens should be 50+75=125, NOT the passed-in 999
		expect(records[0].totalTokens).toBe(125)
	})

	it('should handle undefined token values (fallback to 0)', async () => {
		await recordUsage({
			db,
			workspaceId: TEST_WORKSPACE_ID,
			agentId: TEST_AGENT_ID,
			userId: null,
			type: 'websocket',
			usage: { inputTokens: undefined, outputTokens: undefined, totalTokens: undefined },
		})

		const records = await db
			.select()
			.from(schema.usage)
			.where(eq(schema.usage.workspaceId, TEST_WORKSPACE_ID))
		expect(records[0].inputTokens).toBe(0)
		expect(records[0].outputTokens).toBe(0)
		expect(records[0].totalTokens).toBe(0)
	})

	it('should handle NaN token values (fallback to 0)', async () => {
		await recordUsage({
			db,
			workspaceId: TEST_WORKSPACE_ID,
			agentId: TEST_AGENT_ID,
			userId: null,
			type: 'chat',
			usage: { inputTokens: NaN, outputTokens: Infinity, totalTokens: -Infinity },
		})

		const records = await db
			.select()
			.from(schema.usage)
			.where(eq(schema.usage.workspaceId, TEST_WORKSPACE_ID))
		expect(records[0].inputTokens).toBe(0)
		expect(records[0].outputTokens).toBe(0)
		expect(records[0].totalTokens).toBe(0)
	})

	it('should not throw on insert failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		// Insert with invalid FK reference — should not throw
		await recordUsage({
			db,
			workspaceId: 'nonexistent_workspace',
			agentId: TEST_AGENT_ID,
			userId: null,
			type: 'chat',
			usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
		})

		expect(consoleSpy).toHaveBeenCalledWith('Usage insert failed:', expect.anything())
		consoleSpy.mockRestore()
	})

	it('should accept null metadata', async () => {
		await recordUsage({
			db,
			workspaceId: TEST_WORKSPACE_ID,
			agentId: TEST_AGENT_ID,
			userId: TEST_USER_ID,
			type: 'tool_execution',
			usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
		})

		const records = await db
			.select()
			.from(schema.usage)
			.where(eq(schema.usage.workspaceId, TEST_WORKSPACE_ID))
		expect(records).toHaveLength(1)
		expect(records[0].type).toBe('tool_execution')
	})
})
