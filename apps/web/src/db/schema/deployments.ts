import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from 'web-app/db/schema/agents'
import { users } from 'web-app/db/schema/auth'

export const deployments = sqliteTable('deployments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	agentId: text('agentId')
		.notNull()
		.references(() => agents.id, { onDelete: 'cascade' }),
	version: text('version').notNull(),
	environment: text('environment').notNull().default('production'),
	status: text('status').notNull().default('pending'),
	url: text('url'),
	metadata: text('metadata', { mode: 'json' }).$type<{
		buildTime?: number
		commitHash?: string
		config?: Record<string, unknown>
	}>(),
	deployedBy: text('deployedBy')
		.notNull()
		.references(() => users.id),
	deployedAt: integer('deployedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
