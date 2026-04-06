/**
 * Unit tests for database schema definitions and queries
 *
 * Tests cover:
 * - Schema definitions compile correctly
 * - Schema migrations apply without errors
 * - Agents table CRUD operations
 * - Agent versions table versioning logic
 * - Tools table with JSON schema storage
 * - Workspaces table with member relationships
 * - Webhooks table with agent foreign key
 * - Conversations table message storage
 * - Usage table aggregation queries
 * - Cascade deletes work correctly
 * - Unique constraints are enforced
 */

import { env } from 'cloudflare:test'
import type { MessageMetadata } from '@hare/types'
import { count, eq, sum } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { createDb } from '../client'
import { createId } from '../id'
import {
	agents,
	agentTools,
	agentVersions,
	apiKeys,
	conversations,
	messages,
	tools,
	usage,
	users,
	webhookLogs,
	webhooks,
	workspaceInvitations,
	workspaceMembers,
	workspaces,
} from '../schema'
import { insertAgentSchema, insertUserSchema, insertWorkspaceSchema } from '../schema/zod'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
	}
}

/**
 * SQL migration statements for test database setup.
 * These match the actual migrations in apps/web/migrations.
 */
const MIGRATION_STATEMENTS = [
	// Users table (required for auth)
	`CREATE TABLE IF NOT EXISTS "user" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL UNIQUE, "emailVerified" integer DEFAULT false NOT NULL, "image" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Sessions table (required for auth)
	`CREATE TABLE IF NOT EXISTS "session" ("id" text PRIMARY KEY NOT NULL, "expiresAt" integer NOT NULL, "token" text NOT NULL UNIQUE, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL, "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE)`,

	// Accounts table (required for OAuth)
	`CREATE TABLE IF NOT EXISTS "account" ("id" text PRIMARY KEY NOT NULL, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" integer, "refreshTokenExpiresAt" integer, "scope" text, "password" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Verification table (required for auth)
	`CREATE TABLE IF NOT EXISTS "verification" ("id" text PRIMARY KEY NOT NULL, "identifier" text NOT NULL, "value" text NOT NULL, "expiresAt" integer NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workspaces table
	`CREATE TABLE IF NOT EXISTS "workspaces" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL UNIQUE, "description" text, "ownerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "stripeCustomerId" text, "stripeSubscriptionId" text, "planId" text DEFAULT 'free', "currentPeriodEnd" integer, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workspace members table
	`CREATE TABLE IF NOT EXISTS "workspace_members" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "role" text DEFAULT 'member' NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workspace invitations table
	`CREATE TABLE IF NOT EXISTS "workspace_invitations" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "email" text NOT NULL, "role" text DEFAULT 'member' NOT NULL, "token" text NOT NULL UNIQUE, "invitedBy" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "status" text DEFAULT 'pending' NOT NULL, "expiresAt" integer NOT NULL, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Agents table
	`CREATE TABLE IF NOT EXISTS "agents" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "description" text, "instructions" text, "model" text NOT NULL, "status" text DEFAULT 'draft' NOT NULL, "systemToolsEnabled" integer DEFAULT true NOT NULL, "config" text, "conversationStarters" text, "guardrailsEnabled" integer DEFAULT false NOT NULL, "createdBy" text NOT NULL REFERENCES "user"("id"), "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Agent versions table
	`CREATE TABLE IF NOT EXISTS "agent_versions" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "version" integer NOT NULL, "instructions" text, "model" text NOT NULL, "config" text, "toolIds" text, "createdAt" integer NOT NULL, "createdBy" text NOT NULL REFERENCES "user"("id"))`,

	// Tools table
	`CREATE TABLE IF NOT EXISTS "tools" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "description" text, "type" text NOT NULL, "config" text, "inputSchema" text, "createdBy" text NOT NULL REFERENCES "user"("id"), "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Agent tools junction table
	`CREATE TABLE IF NOT EXISTS "agent_tools" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "toolId" text NOT NULL REFERENCES "tools"("id") ON DELETE CASCADE, "createdAt" integer NOT NULL)`,

	// API Keys table (key column removed - only hash stored for security)
	`CREATE TABLE IF NOT EXISTS "api_keys" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "hashedKey" text NOT NULL, "prefix" text NOT NULL, "lastUsedAt" integer, "expiresAt" integer, "permissions" text, "createdBy" text NOT NULL REFERENCES "user"("id"), "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Usage table
	`CREATE TABLE IF NOT EXISTS "usage" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "agentId" text REFERENCES "agents"("id") ON DELETE SET NULL, "userId" text REFERENCES "user"("id") ON DELETE SET NULL, "type" text NOT NULL, "inputTokens" integer DEFAULT 0, "outputTokens" integer DEFAULT 0, "totalTokens" integer DEFAULT 0, "cost" integer DEFAULT 0, "metadata" text, "createdAt" integer NOT NULL)`,

	// Conversations table
	`CREATE TABLE IF NOT EXISTS "conversations" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "userId" text REFERENCES "user"("id") ON DELETE CASCADE, "title" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Messages table
	`CREATE TABLE IF NOT EXISTS "messages" ("id" text PRIMARY KEY NOT NULL, "conversationId" text NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE, "role" text NOT NULL, "content" text NOT NULL, "metadata" text, "createdAt" integer NOT NULL)`,

	// Webhooks table
	`CREATE TABLE IF NOT EXISTS "webhooks" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "url" text NOT NULL, "secret" text NOT NULL, "events" text NOT NULL, "status" text DEFAULT 'active' NOT NULL, "description" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Webhook logs table
	`CREATE TABLE IF NOT EXISTS "webhook_logs" ("id" text PRIMARY KEY NOT NULL, "webhookId" text NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE, "event" text NOT NULL, "payload" text NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "responseStatus" integer, "responseBody" text, "attempts" integer DEFAULT 1 NOT NULL, "error" text, "createdAt" integer NOT NULL, "completedAt" integer)`,

	// Message feedback table
	`CREATE TABLE IF NOT EXISTS "message_feedback" ("id" text PRIMARY KEY NOT NULL, "messageId" text NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE, "conversationId" text NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "userId" text REFERENCES "user"("id") ON DELETE SET NULL, "rating" text NOT NULL, "comment" text, "createdAt" integer NOT NULL)`,

	// Knowledge bases table
	`CREATE TABLE IF NOT EXISTS "knowledge_bases" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "description" text, "createdBy" text NOT NULL REFERENCES "user"("id"), "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Documents table
	`CREATE TABLE IF NOT EXISTS "documents" ("id" text PRIMARY KEY NOT NULL, "knowledgeBaseId" text NOT NULL REFERENCES "knowledge_bases"("id") ON DELETE CASCADE, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "type" text NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "r2Key" text, "sourceUrl" text, "sizeBytes" integer, "chunkCount" integer DEFAULT 0, "tokenCount" integer DEFAULT 0, "error" text, "metadata" text, "uploadedBy" text NOT NULL REFERENCES "user"("id"), "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Document chunks table
	`CREATE TABLE IF NOT EXISTS "document_chunks" ("id" text PRIMARY KEY NOT NULL, "documentId" text NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE, "knowledgeBaseId" text NOT NULL REFERENCES "knowledge_bases"("id") ON DELETE CASCADE, "chunkIndex" integer NOT NULL, "content" text NOT NULL, "tokenCount" integer, "vectorId" text, "metadata" text, "createdAt" integer NOT NULL)`,

	// Agent knowledge bases junction table
	`CREATE TABLE IF NOT EXISTS "agent_knowledge_bases" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "knowledgeBaseId" text NOT NULL REFERENCES "knowledge_bases"("id") ON DELETE CASCADE, "createdAt" integer NOT NULL)`,

	// Guardrails table
	`CREATE TABLE IF NOT EXISTS "guardrails" ("id" text PRIMARY KEY NOT NULL, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "description" text, "type" text NOT NULL, "action" text DEFAULT 'block' NOT NULL, "enabled" integer DEFAULT true NOT NULL, "config" text, "message" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Guardrail violations table
	`CREATE TABLE IF NOT EXISTS "guardrail_violations" ("id" text PRIMARY KEY NOT NULL, "guardrailId" text NOT NULL REFERENCES "guardrails"("id") ON DELETE CASCADE, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "direction" text NOT NULL, "actionTaken" text NOT NULL, "triggerContent" text, "details" text, "createdAt" integer NOT NULL)`,

	// Workflows table
	`CREATE TABLE IF NOT EXISTS "workflows" ("id" text PRIMARY KEY NOT NULL, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "name" text NOT NULL, "description" text, "status" text DEFAULT 'draft' NOT NULL, "canvasLayout" text, "createdBy" text NOT NULL REFERENCES "user"("id"), "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,

	// Workflow nodes table
	`CREATE TABLE IF NOT EXISTS "workflow_nodes" ("id" text PRIMARY KEY NOT NULL, "workflowId" text NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE, "type" text NOT NULL, "agentId" text REFERENCES "agents"("id") ON DELETE SET NULL, "label" text NOT NULL, "config" text, "positionX" integer DEFAULT 0 NOT NULL, "positionY" integer DEFAULT 0 NOT NULL, "createdAt" integer NOT NULL)`,

	// Workflow edges table
	`CREATE TABLE IF NOT EXISTS "workflow_edges" ("id" text PRIMARY KEY NOT NULL, "workflowId" text NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE, "sourceNodeId" text NOT NULL REFERENCES "workflow_nodes"("id") ON DELETE CASCADE, "targetNodeId" text NOT NULL REFERENCES "workflow_nodes"("id") ON DELETE CASCADE, "label" text, "config" text, "createdAt" integer NOT NULL)`,

	// Workflow executions table
	`CREATE TABLE IF NOT EXISTS "workflow_executions" ("id" text PRIMARY KEY NOT NULL, "workflowId" text NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "status" text DEFAULT 'pending' NOT NULL, "input" text, "output" text, "triggeredBy" text REFERENCES "user"("id"), "startedAt" integer NOT NULL, "completedAt" integer, "durationMs" integer, "error" text)`,

	// Workflow step executions table
	`CREATE TABLE IF NOT EXISTS "workflow_step_executions" ("id" text PRIMARY KEY NOT NULL, "executionId" text NOT NULL REFERENCES "workflow_executions"("id") ON DELETE CASCADE, "nodeId" text NOT NULL REFERENCES "workflow_nodes"("id") ON DELETE CASCADE, "agentId" text REFERENCES "agents"("id") ON DELETE SET NULL, "status" text DEFAULT 'pending' NOT NULL, "input" text, "output" text, "startedAt" integer, "completedAt" integer, "durationMs" integer, "error" text)`,

	// Conversation outcomes table
	`CREATE TABLE IF NOT EXISTS "conversation_outcomes" ("id" text PRIMARY KEY NOT NULL, "conversationId" text NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE, "agentId" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE, "workspaceId" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE, "outcome" text NOT NULL, "messageCount" integer DEFAULT 0 NOT NULL, "durationSeconds" integer, "avgResponseTimeMs" integer, "toolCallCount" integer DEFAULT 0 NOT NULL, "tags" text, "notes" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS "conv_outcomes_conversation_unique" ON "conversation_outcomes" ("conversationId")`,
]

/**
 * Apply migrations to the D1 database.
 */
async function applyMigrations(db: D1Database): Promise<void> {
	const statements = MIGRATION_STATEMENTS.map((sql) => db.prepare(sql))
	await db.batch(statements)
}

// Helper to create timestamp in seconds (Drizzle mode: 'timestamp')
function nowSeconds(): number {
	return Math.floor(Date.now() / 1000)
}

// Test counter for unique values
let testCounter = 0
function uniqueId(prefix: string): string {
	testCounter++
	return `${prefix}_${Date.now()}_${testCounter}`
}

beforeAll(async () => {
	await applyMigrations(env.DB)
})

describe('Schema Definition Tests', () => {
	describe('Drizzle schema definitions compile correctly', () => {
		it('users schema has correct structure', () => {
			expect(users.id).toBeDefined()
			expect(users.name).toBeDefined()
			expect(users.email).toBeDefined()
			expect(users.emailVerified).toBeDefined()
			expect(users.createdAt).toBeDefined()
			expect(users.updatedAt).toBeDefined()
		})

		it('workspaces schema has correct structure', () => {
			expect(workspaces.id).toBeDefined()
			expect(workspaces.name).toBeDefined()
			expect(workspaces.slug).toBeDefined()
			expect(workspaces.ownerId).toBeDefined()
			expect(workspaces.planId).toBeDefined()
			expect(workspaces.createdAt).toBeDefined()
			expect(workspaces.updatedAt).toBeDefined()
		})

		it('agents schema has correct structure', () => {
			expect(agents.id).toBeDefined()
			expect(agents.workspaceId).toBeDefined()
			expect(agents.name).toBeDefined()
			expect(agents.description).toBeDefined()
			expect(agents.instructions).toBeDefined()
			expect(agents.model).toBeDefined()
			expect(agents.status).toBeDefined()
			expect(agents.systemToolsEnabled).toBeDefined()
			expect(agents.config).toBeDefined()
			expect(agents.createdBy).toBeDefined()
			expect(agents.createdAt).toBeDefined()
			expect(agents.updatedAt).toBeDefined()
		})

		it('agent_versions schema has correct structure', () => {
			expect(agentVersions.id).toBeDefined()
			expect(agentVersions.agentId).toBeDefined()
			expect(agentVersions.version).toBeDefined()
			expect(agentVersions.instructions).toBeDefined()
			expect(agentVersions.model).toBeDefined()
			expect(agentVersions.config).toBeDefined()
			expect(agentVersions.toolIds).toBeDefined()
			expect(agentVersions.createdBy).toBeDefined()
			expect(agentVersions.createdAt).toBeDefined()
		})

		it('tools schema has correct structure', () => {
			expect(tools.id).toBeDefined()
			expect(tools.workspaceId).toBeDefined()
			expect(tools.name).toBeDefined()
			expect(tools.description).toBeDefined()
			expect(tools.type).toBeDefined()
			expect(tools.inputSchema).toBeDefined()
			expect(tools.config).toBeDefined()
			expect(tools.createdBy).toBeDefined()
			expect(tools.createdAt).toBeDefined()
			expect(tools.updatedAt).toBeDefined()
		})

		it('webhooks schema has correct structure', () => {
			expect(webhooks.id).toBeDefined()
			expect(webhooks.agentId).toBeDefined()
			expect(webhooks.url).toBeDefined()
			expect(webhooks.secret).toBeDefined()
			expect(webhooks.events).toBeDefined()
			expect(webhooks.status).toBeDefined()
			expect(webhooks.description).toBeDefined()
			expect(webhooks.createdAt).toBeDefined()
			expect(webhooks.updatedAt).toBeDefined()
		})

		it('conversations and messages schemas have correct structure', () => {
			expect(conversations.id).toBeDefined()
			expect(conversations.workspaceId).toBeDefined()
			expect(conversations.agentId).toBeDefined()
			expect(conversations.userId).toBeDefined()
			expect(conversations.title).toBeDefined()
			expect(conversations.createdAt).toBeDefined()
			expect(conversations.updatedAt).toBeDefined()

			expect(messages.id).toBeDefined()
			expect(messages.conversationId).toBeDefined()
			expect(messages.role).toBeDefined()
			expect(messages.content).toBeDefined()
			expect(messages.metadata).toBeDefined()
			expect(messages.createdAt).toBeDefined()
		})

		it('usage schema has correct structure', () => {
			expect(usage.id).toBeDefined()
			expect(usage.workspaceId).toBeDefined()
			expect(usage.agentId).toBeDefined()
			expect(usage.userId).toBeDefined()
			expect(usage.type).toBeDefined()
			expect(usage.inputTokens).toBeDefined()
			expect(usage.outputTokens).toBeDefined()
			expect(usage.totalTokens).toBeDefined()
			expect(usage.cost).toBeDefined()
			expect(usage.metadata).toBeDefined()
			expect(usage.createdAt).toBeDefined()
		})
	})

	describe('Zod schemas validate correctly', () => {
		it('insertUserSchema validates user input', () => {
			const validUser = {
				id: createId(),
				name: 'Test User',
				email: 'test@example.com',
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}
			const result = insertUserSchema.safeParse(validUser)
			expect(result.success).toBe(true)
		})

		it('insertUserSchema rejects invalid email', () => {
			const invalidUser = {
				id: createId(),
				name: 'Test User',
				email: 'invalid-email',
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}
			const result = insertUserSchema.safeParse(invalidUser)
			expect(result.success).toBe(false)
		})

		it('insertWorkspaceSchema validates workspace input', () => {
			const validWorkspace = {
				id: createId(),
				name: 'Test Workspace',
				slug: 'test-workspace',
				ownerId: createId(),
				createdAt: new Date(),
				updatedAt: new Date(),
			}
			const result = insertWorkspaceSchema.safeParse(validWorkspace)
			expect(result.success).toBe(true)
		})

		it('insertAgentSchema validates agent input', () => {
			const validAgent = {
				id: createId(),
				workspaceId: createId(),
				name: 'Test Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				createdBy: createId(),
				createdAt: new Date(),
				updatedAt: new Date(),
			}
			const result = insertAgentSchema.safeParse(validAgent)
			expect(result.success).toBe(true)
		})

		it('insertAgentSchema validates config JSON', () => {
			const agentWithConfig = {
				id: createId(),
				workspaceId: createId(),
				name: 'Test Agent',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				config: {
					temperature: 0.7,
					maxTokens: 1000,
					topP: 0.9,
				},
				createdBy: createId(),
				createdAt: new Date(),
				updatedAt: new Date(),
			}
			const result = insertAgentSchema.safeParse(agentWithConfig)
			expect(result.success).toBe(true)
		})
	})
})

describe('Schema Migration Tests', () => {
	it('migrations apply without errors', async () => {
		// Migrations were applied in beforeAll, verify tables exist
		const db = createDb(env.DB)
		const result = await db.select().from(users).limit(1)
		expect(Array.isArray(result)).toBe(true)
	})

	it('all tables are created', async () => {
		const db = createDb(env.DB)

		// Verify each table exists by running a simple query
		await expect(db.select().from(users).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(workspaces).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(workspaceMembers).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(workspaceInvitations).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(agents).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(agentVersions).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(tools).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(agentTools).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(apiKeys).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(usage).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(conversations).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(messages).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(webhooks).limit(1)).resolves.toBeDefined()
		await expect(db.select().from(webhookLogs).limit(1)).resolves.toBeDefined()
	})
})

describe('Agents Table CRUD Operations', () => {
	it('creates an agent', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		// Create user first
		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create workspace
		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create agent
		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Test Agent',
			description: 'A test agent',
			instructions: 'You are a helpful assistant',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			status: 'draft',
			systemToolsEnabled: true,
			config: { temperature: 0.7, maxTokens: 1000 },
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Verify
		const result = await db.select().from(agents).where(eq(agents.id, agentId))
		expect(result).toHaveLength(1)
		expect(result[0]?.name).toBe('Test Agent')
		expect(result[0]?.description).toBe('A test agent')
		expect(result[0]?.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast')
		expect(result[0]?.status).toBe('draft')
		expect(result[0]?.systemToolsEnabled).toBe(true)
	})

	it('reads agent with all fields', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Read Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Read Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		const config = { temperature: 0.5, maxTokens: 2000, topP: 0.9 }
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Read Agent',
			description: 'Agent for reading',
			instructions: 'Read these instructions',
			model: '@cf/mistral/mistral-7b-instruct-v0.1',
			status: 'deployed',
			systemToolsEnabled: false,
			config,
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const result = await db.select().from(agents).where(eq(agents.id, agentId))
		expect(result).toHaveLength(1)
		// biome-ignore lint/style/noNonNullAssertion: checked by toHaveLength(1) above
		const agent = result[0]!
		expect(agent.config).toEqual(config)
		expect(agent.systemToolsEnabled).toBe(false)
		expect(agent.status).toBe('deployed')
	})

	it('updates an agent', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Update Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Update Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Original Name',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			status: 'draft',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Update
		await db
			.update(agents)
			.set({
				name: 'Updated Name',
				description: 'New description',
				status: 'deployed',
				updatedAt: new Date((now + 100) * 1000),
			})
			.where(eq(agents.id, agentId))

		const result = await db.select().from(agents).where(eq(agents.id, agentId))
		expect(result[0]?.name).toBe('Updated Name')
		expect(result[0]?.description).toBe('New description')
		expect(result[0]?.status).toBe('deployed')
	})

	it('deletes an agent', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Delete Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Delete Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Agent to Delete',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Delete
		await db.delete(agents).where(eq(agents.id, agentId))

		const result = await db.select().from(agents).where(eq(agents.id, agentId))
		expect(result).toHaveLength(0)
	})
})

describe('Agent Versions Table Versioning Logic', () => {
	it('creates version records with incrementing version numbers', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Version Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Version Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Versioned Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			instructions: 'Version 1 instructions',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create version 1
		const version1Id = uniqueId('ver')
		await db.insert(agentVersions).values({
			id: version1Id,
			agentId,
			version: 1,
			instructions: 'Version 1 instructions',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			config: { temperature: 0.7 },
			toolIds: ['tool1', 'tool2'],
			createdBy: userId,
			createdAt: new Date(now * 1000),
		})

		// Create version 2
		const version2Id = uniqueId('ver')
		await db.insert(agentVersions).values({
			id: version2Id,
			agentId,
			version: 2,
			instructions: 'Version 2 instructions - updated',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			config: { temperature: 0.8, maxTokens: 2000 },
			toolIds: ['tool1', 'tool2', 'tool3'],
			createdBy: userId,
			createdAt: new Date((now + 100) * 1000),
		})

		// Verify versions
		const versions = await db
			.select()
			.from(agentVersions)
			.where(eq(agentVersions.agentId, agentId))
			.orderBy(agentVersions.version)

		expect(versions).toHaveLength(2)
		expect(versions[0]?.version).toBe(1)
		expect(versions[0]?.instructions).toBe('Version 1 instructions')
		expect(versions[0]?.toolIds).toEqual(['tool1', 'tool2'])
		expect(versions[1]?.version).toBe(2)
		expect(versions[1]?.instructions).toBe('Version 2 instructions - updated')
		expect(versions[1]?.toolIds).toEqual(['tool1', 'tool2', 'tool3'])
	})

	it('stores JSON config correctly', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Config Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Config Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Config Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const config = {
			temperature: 0.7,
			maxTokens: 4096,
			topP: 0.95,
			topK: 40,
			stopSequences: ['END', 'STOP'],
		}

		const versionId = uniqueId('ver')
		await db.insert(agentVersions).values({
			id: versionId,
			agentId,
			version: 1,
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			config,
			createdBy: userId,
			createdAt: new Date(now * 1000),
		})

		const result = await db.select().from(agentVersions).where(eq(agentVersions.id, versionId))
		expect(result[0]?.config).toEqual(config)
	})
})

describe('Tools Table with JSON Schema Storage', () => {
	it('creates tool with JSON input schema', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Tool Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Tool Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const inputSchema = {
			type: 'object' as const,
			properties: {
				query: {
					type: 'string' as const,
					description: 'Search query',
				},
				limit: {
					type: 'number' as const,
					description: 'Maximum results',
					default: 10,
				},
			},
			required: ['query'],
		}

		const toolConfig = {
			url: 'https://api.example.com/search',
			method: 'GET',
			headers: { 'X-API-Key': 'secret' },
		}

		const toolId = uniqueId('tool')
		await db.insert(tools).values({
			id: toolId,
			workspaceId,
			name: 'Search Tool',
			description: 'Searches for information',
			type: 'http',
			inputSchema,
			config: toolConfig,
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const result = await db.select().from(tools).where(eq(tools.id, toolId))
		expect(result).toHaveLength(1)
		expect(result[0]?.inputSchema).toEqual(inputSchema)
		expect(result[0]?.config).toEqual(toolConfig)
		expect(result[0]?.type).toBe('http')
	})

	it('creates agent-tool relationships', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'AT Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'AT Test Workspace',
			slug: uniqueId('slug'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Tool Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const tool1Id = uniqueId('tool')
		const tool2Id = uniqueId('tool')

		await db.insert(tools).values([
			{
				id: tool1Id,
				workspaceId,
				name: 'Tool 1',
				type: 'http',
				createdBy: userId,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
			{
				id: tool2Id,
				workspaceId,
				name: 'Tool 2',
				type: 'custom',
				createdBy: userId,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
		])

		// Create relationships
		await db.insert(agentTools).values([
			{
				id: uniqueId('at'),
				agentId,
				toolId: tool1Id,
				createdAt: new Date(now * 1000),
			},
			{
				id: uniqueId('at'),
				agentId,
				toolId: tool2Id,
				createdAt: new Date(now * 1000),
			},
		])

		const result = await db.select().from(agentTools).where(eq(agentTools.agentId, agentId))
		expect(result).toHaveLength(2)
	})
})

describe('Workspaces Table with Member Relationships', () => {
	it('creates workspace with owner', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Workspace Owner',
			email: `${userId}@example.com`,
			emailVerified: true,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'My Workspace',
			slug: uniqueId('my-workspace'),
			description: 'A collaborative workspace',
			ownerId: userId,
			planId: 'pro',
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const result = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
		expect(result).toHaveLength(1)
		expect(result[0]?.name).toBe('My Workspace')
		expect(result[0]?.ownerId).toBe(userId)
		expect(result[0]?.planId).toBe('pro')
	})

	it('adds members to workspace', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const ownerId = uniqueId('user')
		const member1Id = uniqueId('user')
		const member2Id = uniqueId('user')

		await db.insert(users).values([
			{
				id: ownerId,
				name: 'Owner',
				email: `${ownerId}@example.com`,
				emailVerified: true,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
			{
				id: member1Id,
				name: 'Member 1',
				email: `${member1Id}@example.com`,
				emailVerified: true,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
			{
				id: member2Id,
				name: 'Member 2',
				email: `${member2Id}@example.com`,
				emailVerified: true,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
		])

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Team Workspace',
			slug: uniqueId('team-ws'),
			ownerId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Add members
		await db.insert(workspaceMembers).values([
			{
				id: uniqueId('wm'),
				workspaceId,
				userId: ownerId,
				role: 'admin',
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
			{
				id: uniqueId('wm'),
				workspaceId,
				userId: member1Id,
				role: 'admin',
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
			{
				id: uniqueId('wm'),
				workspaceId,
				userId: member2Id,
				role: 'member',
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
		])

		const members = await db
			.select()
			.from(workspaceMembers)
			.where(eq(workspaceMembers.workspaceId, workspaceId))

		expect(members).toHaveLength(3)
		const adminCount = members.filter((m) => m.role === 'admin').length
		const memberCount = members.filter((m) => m.role === 'member').length
		expect(adminCount).toBe(2)
		expect(memberCount).toBe(1)
	})

	it('creates workspace invitations', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Inviter',
			email: `${userId}@example.com`,
			emailVerified: true,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Invite Workspace',
			slug: uniqueId('invite-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const invitationId = uniqueId('inv')
		const token = createId()
		await db.insert(workspaceInvitations).values({
			id: invitationId,
			workspaceId,
			email: 'newmember@example.com',
			role: 'member',
			token,
			invitedBy: userId,
			status: 'pending',
			expiresAt: new Date((now + 86400 * 7) * 1000), // 7 days from now
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const result = await db
			.select()
			.from(workspaceInvitations)
			.where(eq(workspaceInvitations.id, invitationId))

		expect(result).toHaveLength(1)
		expect(result[0]?.email).toBe('newmember@example.com')
		expect(result[0]?.status).toBe('pending')
		expect(result[0]?.token).toBe(token)
	})
})

describe('Webhooks Table with Agent Foreign Key', () => {
	it('creates webhook linked to agent', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Webhook Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Webhook Test Workspace',
			slug: uniqueId('webhook-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Webhook Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const webhookId = uniqueId('wh')
		await db.insert(webhooks).values({
			id: webhookId,
			agentId,
			url: 'https://hooks.example.com/webhook',
			secret: 'webhook-secret-123',
			events: ['message.received', 'message.sent', 'error'],
			status: 'active',
			description: 'Notification webhook',
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const result = await db.select().from(webhooks).where(eq(webhooks.id, webhookId))
		expect(result).toHaveLength(1)
		expect(result[0]?.agentId).toBe(agentId)
		expect(result[0]?.events).toEqual(['message.received', 'message.sent', 'error'])
		expect(result[0]?.status).toBe('active')
	})

	it('creates webhook logs', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'WH Log Test User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'WH Log Test Workspace',
			slug: uniqueId('whlog-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Log Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const webhookId = uniqueId('wh')
		await db.insert(webhooks).values({
			id: webhookId,
			agentId,
			url: 'https://hooks.example.com/log',
			secret: 'secret',
			events: ['message.received'],
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create webhook log
		const logId = uniqueId('log')
		await db.insert(webhookLogs).values({
			id: logId,
			webhookId,
			event: 'message.received',
			payload: { message: 'Hello', timestamp: now },
			status: 'success',
			responseStatus: 200,
			responseBody: '{"received": true}',
			attempts: 1,
			createdAt: new Date(now * 1000),
			completedAt: new Date(now * 1000),
		})

		const result = await db.select().from(webhookLogs).where(eq(webhookLogs.id, logId))
		expect(result).toHaveLength(1)
		expect(result[0]?.payload).toEqual({ message: 'Hello', timestamp: now })
		expect(result[0]?.status).toBe('success')
		expect(result[0]?.responseStatus).toBe(200)
	})
})

describe('Conversations Table Message Storage', () => {
	it('creates conversation with messages', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Chat User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Chat Workspace',
			slug: uniqueId('chat-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Chat Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const conversationId = uniqueId('conv')
		await db.insert(conversations).values({
			id: conversationId,
			workspaceId,
			agentId,
			userId,
			title: 'Test Conversation',
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Add messages - use properly typed metadata
		const assistantMetadata: MessageMetadata = {
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			usage: { inputTokens: 10, outputTokens: 15 },
		}

		await db.insert(messages).values([
			{
				id: uniqueId('msg'),
				conversationId,
				role: 'user',
				content: 'Hello, how are you?',
				createdAt: new Date(now * 1000),
			},
			{
				id: uniqueId('msg'),
				conversationId,
				role: 'assistant',
				content: 'I am doing well, thank you! How can I help you today?',
				metadata: assistantMetadata,
				createdAt: new Date((now + 1) * 1000),
			},
			{
				id: uniqueId('msg'),
				conversationId,
				role: 'user',
				content: 'Can you help me with a coding question?',
				createdAt: new Date((now + 2) * 1000),
			},
		])

		const msgs = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(messages.createdAt)

		expect(msgs).toHaveLength(3)
		expect(msgs[0]?.role).toBe('user')
		expect(msgs[1]?.role).toBe('assistant')
		expect(msgs[1]?.metadata).toEqual(assistantMetadata)
		expect(msgs[2]?.role).toBe('user')
	})

	it('stores message metadata with tool calls', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Tool User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Tool Workspace',
			slug: uniqueId('tool-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Tool Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const conversationId = uniqueId('conv')
		await db.insert(conversations).values({
			id: conversationId,
			workspaceId,
			agentId,
			userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Use properly typed metadata with tool calls
		const toolCallMetadata: MessageMetadata = {
			toolCalls: [
				{
					id: 'call_123',
					name: 'search_tool',
					input: { query: 'weather' },
				},
			],
			toolResults: [
				{
					toolCallId: 'call_123',
					output: { temperature: 72, condition: 'sunny' },
				},
			],
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			usage: { inputTokens: 20, outputTokens: 50 },
		}

		const msgId = uniqueId('msg')
		await db.insert(messages).values({
			id: msgId,
			conversationId,
			role: 'assistant',
			content: 'The weather is currently 72°F and sunny.',
			metadata: toolCallMetadata,
			createdAt: new Date(now * 1000),
		})

		const result = await db.select().from(messages).where(eq(messages.id, msgId))
		expect(result[0]?.metadata).toEqual(toolCallMetadata)
	})
})

describe('Usage Table Aggregation Queries', () => {
	it('creates usage records', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Usage User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Usage Workspace',
			slug: uniqueId('usage-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Usage Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create multiple usage records
		await db.insert(usage).values([
			{
				id: uniqueId('use'),
				workspaceId,
				agentId,
				userId,
				type: 'api_call',
				inputTokens: 100,
				outputTokens: 200,
				totalTokens: 300,
				cost: 30,
				metadata: { model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', endpoint: '/chat' },
				createdAt: new Date(now * 1000),
			},
			{
				id: uniqueId('use'),
				workspaceId,
				agentId,
				userId,
				type: 'api_call',
				inputTokens: 150,
				outputTokens: 250,
				totalTokens: 400,
				cost: 40,
				metadata: { model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', endpoint: '/chat' },
				createdAt: new Date((now + 100) * 1000),
			},
			{
				id: uniqueId('use'),
				workspaceId,
				agentId,
				userId,
				type: 'api_call',
				inputTokens: 50,
				outputTokens: 100,
				totalTokens: 150,
				cost: 15,
				metadata: { model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', endpoint: '/stream' },
				createdAt: new Date((now + 200) * 1000),
			},
		])

		// Test aggregation
		const totalUsage = await db
			.select({
				totalInput: sum(usage.inputTokens),
				totalOutput: sum(usage.outputTokens),
				totalTokens: sum(usage.totalTokens),
				totalCost: sum(usage.cost),
				recordCount: count(),
			})
			.from(usage)
			.where(eq(usage.workspaceId, workspaceId))

		expect(totalUsage[0]?.totalInput).toBe('300')
		expect(totalUsage[0]?.totalOutput).toBe('550')
		expect(totalUsage[0]?.totalTokens).toBe('850')
		expect(totalUsage[0]?.totalCost).toBe('85')
		expect(totalUsage[0]?.recordCount).toBe(3)
	})

	it('aggregates usage by agent', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Agent Usage User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Agent Usage Workspace',
			slug: uniqueId('agent-usage-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agent1Id = uniqueId('agent')
		const agent2Id = uniqueId('agent')

		await db.insert(agents).values([
			{
				id: agent1Id,
				workspaceId,
				name: 'Agent 1',
				model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				createdBy: userId,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
			{
				id: agent2Id,
				workspaceId,
				name: 'Agent 2',
				model: '@cf/mistral/mistral-7b-instruct-v0.1',
				createdBy: userId,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			},
		])

		// Create usage for both agents
		await db.insert(usage).values([
			{
				id: uniqueId('use'),
				workspaceId,
				agentId: agent1Id,
				userId,
				type: 'api_call',
				totalTokens: 500,
				cost: 50,
				createdAt: new Date(now * 1000),
			},
			{
				id: uniqueId('use'),
				workspaceId,
				agentId: agent1Id,
				userId,
				type: 'api_call',
				totalTokens: 300,
				cost: 30,
				createdAt: new Date((now + 100) * 1000),
			},
			{
				id: uniqueId('use'),
				workspaceId,
				agentId: agent2Id,
				userId,
				type: 'api_call',
				totalTokens: 200,
				cost: 20,
				createdAt: new Date((now + 200) * 1000),
			},
		])

		// Aggregate by agent
		const agentUsage = await db
			.select({
				agentId: usage.agentId,
				totalTokens: sum(usage.totalTokens),
				totalCost: sum(usage.cost),
			})
			.from(usage)
			.where(eq(usage.workspaceId, workspaceId))
			.groupBy(usage.agentId)

		expect(agentUsage).toHaveLength(2)

		const agent1Usage = agentUsage.find((u) => u.agentId === agent1Id)
		const agent2Usage = agentUsage.find((u) => u.agentId === agent2Id)

		expect(agent1Usage?.totalTokens).toBe('800')
		expect(agent1Usage?.totalCost).toBe('80')
		expect(agent2Usage?.totalTokens).toBe('200')
		expect(agent2Usage?.totalCost).toBe('20')
	})
})

describe('Cascade Delete Tests', () => {
	it('deleting workspace cascades to agents', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Cascade User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Cascade Workspace',
			slug: uniqueId('cascade-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Cascade Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Verify agent exists
		let agentResult = await db.select().from(agents).where(eq(agents.id, agentId))
		expect(agentResult).toHaveLength(1)

		// Delete workspace
		await db.delete(workspaces).where(eq(workspaces.id, workspaceId))

		// Verify agent is deleted
		agentResult = await db.select().from(agents).where(eq(agents.id, agentId))
		expect(agentResult).toHaveLength(0)
	})

	it('deleting agent cascades to conversations and webhooks', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Cascade Agent User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Cascade Agent Workspace',
			slug: uniqueId('cascade-agent-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Delete Me Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create conversation
		const conversationId = uniqueId('conv')
		await db.insert(conversations).values({
			id: conversationId,
			workspaceId,
			agentId,
			userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Create messages
		const msgId = uniqueId('msg')
		await db.insert(messages).values({
			id: msgId,
			conversationId,
			role: 'user',
			content: 'Hello',
			createdAt: new Date(now * 1000),
		})

		// Create webhook
		const webhookId = uniqueId('wh')
		await db.insert(webhooks).values({
			id: webhookId,
			agentId,
			url: 'https://example.com/hook',
			secret: 'secret',
			events: ['message.received'],
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Delete agent
		await db.delete(agents).where(eq(agents.id, agentId))

		// Verify cascades
		const convResult = await db
			.select()
			.from(conversations)
			.where(eq(conversations.id, conversationId))
		expect(convResult).toHaveLength(0)

		const msgResult = await db.select().from(messages).where(eq(messages.id, msgId))
		expect(msgResult).toHaveLength(0)

		const whResult = await db.select().from(webhooks).where(eq(webhooks.id, webhookId))
		expect(whResult).toHaveLength(0)
	})

	it('deleting conversation cascades to messages', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Msg Cascade User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Msg Cascade Workspace',
			slug: uniqueId('msg-cascade-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Msg Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const conversationId = uniqueId('conv')
		await db.insert(conversations).values({
			id: conversationId,
			workspaceId,
			agentId,
			userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const msg1Id = uniqueId('msg')
		const msg2Id = uniqueId('msg')
		await db.insert(messages).values([
			{
				id: msg1Id,
				conversationId,
				role: 'user',
				content: 'Message 1',
				createdAt: new Date(now * 1000),
			},
			{
				id: msg2Id,
				conversationId,
				role: 'assistant',
				content: 'Message 2',
				createdAt: new Date((now + 1) * 1000),
			},
		])

		// Delete conversation
		await db.delete(conversations).where(eq(conversations.id, conversationId))

		// Verify messages are deleted
		const msgResult = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
		expect(msgResult).toHaveLength(0)
	})

	it('deleting agent sets usage.agentId to null', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Usage Set Null User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Usage Set Null Workspace',
			slug: uniqueId('usage-null-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const agentId = uniqueId('agent')
		await db.insert(agents).values({
			id: agentId,
			workspaceId,
			name: 'Usage Agent',
			model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
			createdBy: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const usageId = uniqueId('use')
		await db.insert(usage).values({
			id: usageId,
			workspaceId,
			agentId,
			userId,
			type: 'api_call',
			totalTokens: 100,
			createdAt: new Date(now * 1000),
		})

		// Delete agent
		await db.delete(agents).where(eq(agents.id, agentId))

		// Verify usage record still exists with null agentId
		const usageResult = await db.select().from(usage).where(eq(usage.id, usageId))
		expect(usageResult).toHaveLength(1)
		expect(usageResult[0]?.agentId).toBeNull()
		expect(usageResult[0]?.workspaceId).toBe(workspaceId)
	})
})

describe('Unique Constraint Tests', () => {
	it('enforces unique email on users', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const email = `unique_${Date.now()}@example.com`

		await db.insert(users).values({
			id: uniqueId('user'),
			name: 'First User',
			email,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Try to insert duplicate email
		await expect(
			db.insert(users).values({
				id: uniqueId('user'),
				name: 'Second User',
				email,
				emailVerified: false,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			}),
		).rejects.toThrow()
	})

	it('enforces unique slug on workspaces', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Slug User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const slug = `unique-slug-${Date.now()}`

		await db.insert(workspaces).values({
			id: uniqueId('ws'),
			name: 'First Workspace',
			slug,
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Try to insert duplicate slug
		await expect(
			db.insert(workspaces).values({
				id: uniqueId('ws'),
				name: 'Second Workspace',
				slug,
				ownerId: userId,
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			}),
		).rejects.toThrow()
	})

	it('enforces unique token on workspace invitations', async () => {
		const db = createDb(env.DB)
		const now = nowSeconds()

		const userId = uniqueId('user')
		await db.insert(users).values({
			id: userId,
			name: 'Token User',
			email: `${userId}@example.com`,
			emailVerified: false,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const workspaceId = uniqueId('ws')
		await db.insert(workspaces).values({
			id: workspaceId,
			name: 'Token Workspace',
			slug: uniqueId('token-ws'),
			ownerId: userId,
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		const token = `token_${Date.now()}`

		await db.insert(workspaceInvitations).values({
			id: uniqueId('inv'),
			workspaceId,
			email: 'first@example.com',
			token,
			invitedBy: userId,
			expiresAt: new Date((now + 86400) * 1000),
			createdAt: new Date(now * 1000),
			updatedAt: new Date(now * 1000),
		})

		// Try to insert duplicate token
		await expect(
			db.insert(workspaceInvitations).values({
				id: uniqueId('inv'),
				workspaceId,
				email: 'second@example.com',
				token,
				invitedBy: userId,
				expiresAt: new Date((now + 86400) * 1000),
				createdAt: new Date(now * 1000),
				updatedAt: new Date(now * 1000),
			}),
		).rejects.toThrow()
	})

	// Note: API key uniqueness is handled at the application level
	// (prefix + hashedKey combination ensures identification)
	// No database-level unique constraint on hashedKey (may have multiple keys with same hash)
})
