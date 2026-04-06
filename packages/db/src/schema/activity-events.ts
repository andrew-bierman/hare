import { ACTIVITY_EVENT_TYPES, type ActivityEventType } from '@hare/config'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { workspaces } from './workspaces'

export const activityEvents = sqliteTable(
	'activity_events',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		agentId: text('agentId').references(() => agents.id, { onDelete: 'cascade' }),
		eventType: text('eventType', { enum: ACTIVITY_EVENT_TYPES })
			.notNull()
			.$type<ActivityEventType>(),
		agentName: text('agentName'),
		summary: text('summary').notNull(),
		details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('activity_events_workspace_id_idx').on(table.workspaceId),
		index('activity_events_agent_id_idx').on(table.agentId),
		index('activity_events_created_at_idx').on(table.createdAt),
		index('activity_events_workspace_created_idx').on(table.workspaceId, table.createdAt),
	],
)
