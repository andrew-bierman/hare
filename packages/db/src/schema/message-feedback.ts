import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { users } from './auth'
import { conversations, messages } from './conversations'
import { workspaces } from './workspaces'

/**
 * Message feedback - tracks thumbs up/down on individual messages.
 * Powers satisfaction analytics and agent quality metrics.
 */

export const FEEDBACK_RATINGS = ['positive', 'negative'] as const
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number]

export const messageFeedback = sqliteTable(
	'message_feedback',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		messageId: text('messageId')
			.notNull()
			.references(() => messages.id, { onDelete: 'cascade' }),
		conversationId: text('conversationId')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
		rating: text('rating', { enum: FEEDBACK_RATINGS }).notNull().$type<FeedbackRating>(),
		comment: text('comment'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('feedback_message_idx').on(table.messageId),
		index('feedback_agent_idx').on(table.agentId),
		index('feedback_workspace_idx').on(table.workspaceId),
		index('feedback_workspace_agent_idx').on(table.workspaceId, table.agentId),
		index('feedback_created_at_idx').on(table.createdAt),
	],
)
