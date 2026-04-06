/**
 * Integration tests for billing-usage service.
 *
 * Tests the core usage query functions against real D1 database.
 */

import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@hare/db/schema'
import {
	checkUsageLimits,
	getActiveAgentCount,
	getBillingUsage,
	getMessageCount,
	getTokenUsage,
} from '../billing-usage'

declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
		TEST_MIGRATIONS: D1Migration[]
	}
}

const db = drizzle(env.DB, { schema })

// Test data helpers
const TEST_WORKSPACE_ID = 'ws_test_billing'
const TEST_USER_ID = 'user_test_billing'
const TEST_AGENT_ID = 'agent_test_billing'

async function seedTestUser() {
	await db.insert(schema.users).values({
		id: TEST_USER_ID,
		name: 'Test User',
		email: 'billing-test@example.com',
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
}

async function seedTestWorkspace() {
	await db.insert(schema.workspaces).values({
		id: TEST_WORKSPACE_ID,
		name: 'Test Workspace',
		slug: 'test-billing-ws',
		ownerId: TEST_USER_ID,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
}

async function seedTestAgent(options?: { status?: string; id?: string }) {
	await db.insert(schema.agents).values({
		id: options?.id ?? TEST_AGENT_ID,
		workspaceId: TEST_WORKSPACE_ID,
		name: 'Test Agent',
		model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		status: options?.status ?? 'deployed',
		createdBy: TEST_USER_ID,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
}

async function seedUsageRecord(options?: {
	type?: string
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	createdAt?: Date
}) {
	await db.insert(schema.usage).values({
		workspaceId: TEST_WORKSPACE_ID,
		agentId: TEST_AGENT_ID,
		userId: TEST_USER_ID,
		type: options?.type ?? 'chat',
		inputTokens: options?.inputTokens ?? 100,
		outputTokens: options?.outputTokens ?? 200,
		totalTokens: options?.totalTokens ?? 300,
		createdAt: options?.createdAt ?? new Date(),
	})
}

async function cleanup() {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM usage'),
		env.DB.prepare('DELETE FROM agents'),
		env.DB.prepare('DELETE FROM workspace_members'),
		env.DB.prepare('DELETE FROM workspaces'),
		env.DB.prepare('DELETE FROM "user"'),
	])
}

describe('Billing Usage Service', () => {
	beforeEach(async () => {
		await cleanup()
		await seedTestUser()
		await seedTestWorkspace()
	})

	afterEach(async () => {
		await cleanup()
	})

	describe('getActiveAgentCount', () => {
		it('should return 0 when no agents exist', async () => {
			const count = await getActiveAgentCount({ db, workspaceId: TEST_WORKSPACE_ID })
			expect(count).toBe(0)
		})

		it('should count deployed agents', async () => {
			await seedTestAgent({ id: 'agent_1', status: 'deployed' })
			await seedTestAgent({ id: 'agent_2', status: 'deployed' })
			const count = await getActiveAgentCount({ db, workspaceId: TEST_WORKSPACE_ID })
			expect(count).toBe(2)
		})

		it('should count draft agents as active', async () => {
			await seedTestAgent({ id: 'agent_1', status: 'draft' })
			const count = await getActiveAgentCount({ db, workspaceId: TEST_WORKSPACE_ID })
			expect(count).toBe(1)
		})

		it('should not count archived agents', async () => {
			await seedTestAgent({ id: 'agent_1', status: 'deployed' })
			await seedTestAgent({ id: 'agent_2', status: 'archived' })
			const count = await getActiveAgentCount({ db, workspaceId: TEST_WORKSPACE_ID })
			expect(count).toBe(1)
		})

		it('should not count agents from other workspaces', async () => {
			await seedTestAgent({ id: 'agent_1', status: 'deployed' })
			const count = await getActiveAgentCount({ db, workspaceId: 'other_workspace' })
			expect(count).toBe(0)
		})
	})

	describe('getMessageCount', () => {
		beforeEach(async () => {
			await seedTestAgent()
		})

		it('should return 0 when no messages exist', async () => {
			const count = await getMessageCount({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				periodStart: new Date(0),
			})
			expect(count).toBe(0)
		})

		it('should count chat type messages', async () => {
			await seedUsageRecord({ type: 'chat' })
			await seedUsageRecord({ type: 'chat' })
			const count = await getMessageCount({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				periodStart: new Date(0),
			})
			expect(count).toBe(2)
		})

		it('should not count embed type messages', async () => {
			await seedUsageRecord({ type: 'chat' })
			await seedUsageRecord({ type: 'embed' })
			const count = await getMessageCount({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				periodStart: new Date(0),
			})
			expect(count).toBe(1)
		})

		it('should filter by period start', async () => {
			const oldDate = new Date('2020-01-01')
			const recentDate = new Date()
			await seedUsageRecord({ type: 'chat', createdAt: oldDate })
			await seedUsageRecord({ type: 'chat', createdAt: recentDate })

			const count = await getMessageCount({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				periodStart: new Date('2025-01-01'),
			})
			expect(count).toBe(1)
		})
	})

	describe('getTokenUsage', () => {
		beforeEach(async () => {
			await seedTestAgent()
		})

		it('should return zeros when no usage exists', async () => {
			const tokens = await getTokenUsage({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				periodStart: new Date(0),
			})
			expect(tokens.inputTokens).toBe(0)
			expect(tokens.outputTokens).toBe(0)
			expect(tokens.totalTokens).toBe(0)
		})

		it('should sum token counts', async () => {
			await seedUsageRecord({ inputTokens: 100, outputTokens: 200, totalTokens: 300 })
			await seedUsageRecord({ inputTokens: 50, outputTokens: 150, totalTokens: 200 })

			const tokens = await getTokenUsage({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				periodStart: new Date(0),
			})
			expect(tokens.inputTokens).toBe(150)
			expect(tokens.outputTokens).toBe(350)
			expect(tokens.totalTokens).toBe(500)
		})
	})

	describe('getBillingUsage', () => {
		it('should aggregate all usage stats in parallel', async () => {
			await seedTestAgent({ id: 'agent_1', status: 'deployed' })
			await seedTestAgent({ id: 'agent_2', status: 'deployed' })

			await db.insert(schema.usage).values({
				workspaceId: TEST_WORKSPACE_ID,
				agentId: 'agent_1',
				userId: TEST_USER_ID,
				type: 'chat',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				createdAt: new Date(),
			})

			const stats = await getBillingUsage({ db, workspaceId: TEST_WORKSPACE_ID })
			expect(stats.agentsUsed).toBe(2)
			expect(stats.messagesUsed).toBe(1)
			expect(stats.inputTokens).toBe(100)
			expect(stats.outputTokens).toBe(200)
			expect(stats.totalTokens).toBe(300)
		})
	})

	describe('checkUsageLimits', () => {
		beforeEach(async () => {
			await seedTestAgent({ id: TEST_AGENT_ID, status: 'deployed' })
			await seedTestAgent({ id: 'agent_2', status: 'deployed' })
		})

		it('should report within limits', async () => {
			const result = await checkUsageLimits({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				limits: { maxAgents: 10, maxMessagesPerMonth: 1000 },
			})
			expect(result.withinLimits).toBe(true)
			expect(result.agentsExceeded).toBe(false)
			expect(result.messagesExceeded).toBe(false)
		})

		it('should detect agents exceeded', async () => {
			const result = await checkUsageLimits({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				limits: { maxAgents: 1, maxMessagesPerMonth: 1000 },
			})
			expect(result.withinLimits).toBe(false)
			expect(result.agentsExceeded).toBe(true)
		})

		it('should detect messages exceeded', async () => {
			await seedUsageRecord({ type: 'chat' })
			await seedUsageRecord({ type: 'chat' })

			const result = await checkUsageLimits({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				limits: { maxAgents: 10, maxMessagesPerMonth: 1 },
			})
			expect(result.withinLimits).toBe(false)
			expect(result.messagesExceeded).toBe(true)
		})

		it('should treat -1 as unlimited', async () => {
			const result = await checkUsageLimits({
				db,
				workspaceId: TEST_WORKSPACE_ID,
				limits: { maxAgents: -1, maxMessagesPerMonth: -1 },
			})
			expect(result.withinLimits).toBe(true)
			expect(result.agentsExceeded).toBe(false)
			expect(result.messagesExceeded).toBe(false)
		})
	})
})
