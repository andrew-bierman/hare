import {
	ENUM_DEFAULTS,
	INVITATION_STATUSES,
	InvitationStatus,
	MEMBER_ROLES,
	MemberRole,
	PlanId,
	WORKSPACE_ROLES,
	WorkspaceRole,
} from '@hare/config'
import { createId } from '../id'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './auth'

export const workspaces = sqliteTable('workspaces', {
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
	planId: text('planId').default(ENUM_DEFAULTS.planId).$type<PlanId>(),
	currentPeriodEnd: integer('currentPeriodEnd', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})

export const workspaceMembers = sqliteTable('workspace_members', {
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
		.default(ENUM_DEFAULTS.workspaceRole)
		.$type<WorkspaceRole>(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})

export const workspaceInvitations = sqliteTable('workspace_invitations', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text('workspaceId')
		.notNull()
		.references(() => workspaces.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: text('role', { enum: MEMBER_ROLES })
		.notNull()
		.default(ENUM_DEFAULTS.memberRole)
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
		.default(ENUM_DEFAULTS.invitationStatus)
		.$type<InvitationStatus>(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
