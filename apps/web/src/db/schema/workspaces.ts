import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from 'web-app/db/schema/auth'

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
	planId: text('planId').default('free'),
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
	role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] })
		.notNull()
		.default('member'),
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
	role: text('role', { enum: ['admin', 'member', 'viewer'] })
		.notNull()
		.default('member'),
	token: text('token')
		.notNull()
		.unique()
		.$defaultFn(() => createId()),
	invitedBy: text('invitedBy')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	status: text('status', { enum: ['pending', 'accepted', 'expired', 'revoked'] })
		.notNull()
		.default('pending'),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
