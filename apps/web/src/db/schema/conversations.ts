import type { MessageMetadata } from '@hare/types'
import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from 'web-app/db/schema/agents'
import { users } from 'web-app/db/schema/auth'
import { workspaces } from 'web-app/db/schema/workspaces'

export const conversations = sqliteTable('conversations', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text('workspaceId')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	agentId: text('agentId')
		.notNull()
		.references(() => agents.id, { onDelete: 'cascade' }),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	title: text('title'),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})

export const messages = sqliteTable('messages', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	conversationId: text('conversationId')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
	content: text('content').notNull(),
	metadata: text('metadata', { mode: 'json' }).$type<MessageMetadata>(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
