import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from 'web-app/db/schema/auth'
import { workspaces } from 'web-app/db/schema/workspaces'

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
	model: text('model').notNull().default('claude-3-5-sonnet-20241022'),
	status: text('status', { enum: ['draft', 'deployed', 'archived'] })
		.notNull()
		.default('draft'),
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
