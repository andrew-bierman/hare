import {
	config,
	INVITATION_STATUSES,
	type InvitationStatus,
	MEMBER_ROLES,
	type MemberRole,
	type PlanId,
	WORKSPACE_ROLES,
	type WorkspaceRole,
} from '@hare/config'
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { users } from './auth'

export const workspaces = sqliteTable(
	'workspaces',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		ownerId: text('ownerId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		// Billing fields
		stripeCustomerId: text('stripeCustomerId'),
		stripeSubscriptionId: text('stripeSubscriptionId'),
		planId: text('planId').default(config.defaults.planId).$type<PlanId>(),
		currentPeriodEnd: integer('currentPeriodEnd', { mode: 'timestamp' }),
		// Usage-based billing: token credits balance (1 credit = 1 token)
		creditsBalance: integer('creditsBalance').notNull().default(0),
		freeCreditsResetAt: integer('freeCreditsResetAt', { mode: 'timestamp' }),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		ownerIdx: index('workspaces_owner_idx').on(table.ownerId),
	}),
)

export const workspaceMembers = sqliteTable(
	'workspace_members',
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
		role: text('role', { enum: WORKSPACE_ROLES })
			.notNull()
			.default(config.defaults.workspaceRole)
			.$type<WorkspaceRole>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		workspaceIdx: index('workspace_members_workspace_idx').on(table.workspaceId),
		userIdx: index('workspace_members_user_idx').on(table.userId),
		// Prevent duplicate memberships
		uniqueMembership: unique('workspace_members_unique').on(table.workspaceId, table.userId),
	}),
)

export const workspaceInvitations = sqliteTable(
	'workspace_invitations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		role: text('role', { enum: MEMBER_ROLES })
			.notNull()
			.default(config.defaults.memberRole)
			.$type<MemberRole>(),
		token: text('token')
			.notNull()
			.unique()
			.$defaultFn(() => createId()),
		invitedBy: text('invitedBy')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: text('status', { enum: INVITATION_STATUSES })
			.notNull()
			.default(config.defaults.invitationStatus)
			.$type<InvitationStatus>(),
		expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		workspaceIdx: index('workspace_invitations_workspace_idx').on(table.workspaceId),
		emailIdx: index('workspace_invitations_email_idx').on(table.email),
		statusIdx: index('workspace_invitations_status_idx').on(table.status),
	}),
)
