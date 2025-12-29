import { createId } from '../id'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

export const usage = sqliteTable('usage', {
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
})

export const apiKeys = sqliteTable('api_keys', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text('workspaceId')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	key: text('key').notNull().unique(),
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
})
