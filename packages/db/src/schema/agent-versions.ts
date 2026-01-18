import { createId } from '../id'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { users } from './auth'

export const agentVersions = sqliteTable('agent_versions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	agentId: text('agentId')
		.notNull()
		.references(() => agents.id, { onDelete: 'cascade' }),
	version: integer('version').notNull(),
	instructions: text('instructions'),
	model: text('model').notNull(),
	config: text('config', { mode: 'json' }).$type<{
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
		stopSequences?: string[]
	}>(),
	toolIds: text('toolIds', { mode: 'json' }).$type<string[]>(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	createdBy: text('createdBy')
		.notNull()
		.references(() => users.id),
})
