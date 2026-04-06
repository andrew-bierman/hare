import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { conversations } from './conversations'
import { workspaces } from './workspaces'

/**
 * Conversation Outcomes - tracks business-level results of conversations.
 * Enables resolution rate, handoff rate, and quality tracking.
 */

export const CONVERSATION_OUTCOMES = ['resolved', 'escalated', 'abandoned', 'ongoing'] as const
export type ConversationOutcome = (typeof CONVERSATION_OUTCOMES)[number]

export const conversationOutcomes = sqliteTable(
	'conversation_outcomes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		conversationId: text('conversationId')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		outcome: text('outcome', { enum: CONVERSATION_OUTCOMES })
			.notNull()
			.$type<ConversationOutcome>(),
		/** Number of messages in the conversation */
		messageCount: integer('messageCount').notNull().default(0),
		/** Duration from first to last message in seconds */
		durationSeconds: integer('durationSeconds'),
		/** Average response time in milliseconds */
		avgResponseTimeMs: integer('avgResponseTimeMs'),
		/** Number of tool calls made during conversation */
		toolCallCount: integer('toolCallCount').notNull().default(0),
		/** Tags for categorization */
		tags: text('tags', { mode: 'json' }).$type<string[]>(),
		/** Optional notes */
		notes: text('notes'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		uniqueIndex('conv_outcomes_conversation_unique').on(table.conversationId),
		index('conv_outcomes_conversation_idx').on(table.conversationId),
		index('conv_outcomes_agent_idx').on(table.agentId),
		index('conv_outcomes_workspace_idx').on(table.workspaceId),
		index('conv_outcomes_outcome_idx').on(table.outcome),
		index('conv_outcomes_workspace_agent_idx').on(table.workspaceId, table.agentId),
		index('conv_outcomes_created_at_idx').on(table.createdAt),
	],
)
