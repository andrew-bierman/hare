import { MESSAGE_ROLES, MessageRole } from '@hare/config'
import { createId } from '../id'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'
import type { MessageMetadata } from '@hare/types'

export const conversations = sqliteTable(
	'conversations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		userId: text('userId').references(() => users.id, { onDelete: 'cascade' }),
		title: text('title'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		// Index for listing conversations by agent (frequent query)
		index('conversations_agent_idx').on(table.agentId),
		// Index for listing conversations by workspace
		index('conversations_workspace_idx').on(table.workspaceId),
	],
)

export const messages = sqliteTable(
	'messages',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		conversationId: text('conversationId')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		role: text('role', { enum: MESSAGE_ROLES }).notNull().$type<MessageRole>(),
		content: text('content').notNull(),
		metadata: text('metadata', { mode: 'json' }).$type<MessageMetadata>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		// Index for fetching messages by conversation (most frequent query)
		index('messages_conversation_idx').on(table.conversationId),
		// Composite index for fetching messages with ordering
		index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
	],
)
