import { AGENT_STATUSES, type AgentStatus, config } from '@hare/config'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { users } from './auth'
import { workspaces } from './workspaces'

export const agents = sqliteTable(
	'agents',
	{
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
			.default(config.defaults.agentStatus)
			.$type<AgentStatus>(),
		systemToolsEnabled: integer('systemToolsEnabled', { mode: 'boolean' }).notNull().default(true),
		config: text('config', { mode: 'json' }).$type<{
			temperature?: number
			maxTokens?: number
			topP?: number
			topK?: number
			stopSequences?: string[]
		}>(),
		/** Suggested first messages shown in chat widget */
		conversationStarters: text('conversationStarters', { mode: 'json' }).$type<string[]>(),
		/** Guardrails configuration for input/output safety */
		guardrailsEnabled: integer('guardrailsEnabled', { mode: 'boolean' }).notNull().default(false),
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
		// Index for listing agents by workspace (most frequent query)
		index('agents_workspace_idx').on(table.workspaceId),
		index('agents_status_idx').on(table.status),
		index('agents_created_by_idx').on(table.createdBy),
		index('agents_workspace_status_idx').on(table.workspaceId, table.status),
	],
)
