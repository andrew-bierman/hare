import { createId } from '../id'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

export const usage = sqliteTable(
	'usage',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		agentId: text('agentId').references(() => agents.id, { onDelete: 'set null' }),
		userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
		type: text('type').notNull(), // 'api_call', 'tokens', 'storage', etc.
		inputTokens: integer('inputTokens').default(0),
		outputTokens: integer('outputTokens').default(0),
		totalTokens: integer('totalTokens').default(0),
		cost: integer('cost').default(0), // Store as cents or smallest currency unit
		metadata: text('metadata', { mode: 'json' }).$type<{
			model?: string
			endpoint?: string
			duration?: number
			statusCode?: number
		}>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		// Index for analytics queries (most frequent)
		index('usage_workspace_created_idx').on(table.workspaceId, table.createdAt),
		// Index for filtering by agent
		index('usage_agent_idx').on(table.agentId),
	],
)

export const apiKeys = sqliteTable(
	'api_keys',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		// SECURITY: Only the hash is stored, never the plaintext key
		hashedKey: text('hashedKey').notNull(),
		prefix: text('prefix').notNull(), // First few chars for identification
		lastUsedAt: integer('lastUsedAt', { mode: 'timestamp' }),
		expiresAt: integer('expiresAt', { mode: 'timestamp' }),
		permissions: text('permissions', { mode: 'json' }).$type<{
			scopes?: string[]
			agentIds?: string[]
		}>(),
		createdBy: text('createdBy')
			.notNull()
			.references(() => users.id),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		// Index for API key authentication lookups (critical for performance)
		index('api_keys_hashed_key_idx').on(table.hashedKey),
		// Index for listing keys by workspace
		index('api_keys_workspace_idx').on(table.workspaceId),
	],
)
