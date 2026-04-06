import { AUDIT_ACTIONS, type AuditAction } from '@hare/config'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { users } from './auth'
import { workspaces } from './workspaces'

export const auditLogs = sqliteTable(
	'audit_logs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		action: text('action', { enum: AUDIT_ACTIONS }).notNull().$type<AuditAction>(),
		resourceType: text('resourceType').notNull(),
		resourceId: text('resourceId'),
		details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
		ipAddress: text('ipAddress'),
		userAgent: text('userAgent'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('audit_logs_workspace_id_idx').on(table.workspaceId),
		index('audit_logs_created_at_idx').on(table.createdAt),
		index('audit_logs_workspace_created_idx').on(table.workspaceId, table.createdAt),
	],
)
