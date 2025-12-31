import { AGENT_STATUSES, AgentStatus, Config } from '@hare/config'
import { createId } from '../id'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './auth'
import { workspaces } from './workspaces'

export const agents = sqliteTable('agents', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text('workspaceId')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	instructions: text('instructions'),
	model: text('model').notNull(),
	status: text('status', { enum: AGENT_STATUSES })
		.notNull()
		.default(Config.defaults.agentStatus)
		.$type<AgentStatus>(),
	systemToolsEnabled: integer('systemToolsEnabled', { mode: 'boolean' }).notNull().default(true),
	config: text('config', { mode: 'json' }).$type<{
		temperature?: number
		maxTokens?: number
		topP?: number
		topK?: number
		stopSequences?: string[]
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
