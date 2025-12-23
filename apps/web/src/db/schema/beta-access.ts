import { createId } from '@paralleldrive/cuid2'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from 'web-app/db/schema/auth'

/**
 * Beta access control table
 * Tracks which users have access to beta features during development
 */
export const betaAccess = sqliteTable('beta_access', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text('userId')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: text('email').notNull(), // Denormalized for easier querying
	status: text('status', { enum: ['active', 'suspended', 'revoked'] })
		.notNull()
		.default('active'),
	notes: text('notes'), // Admin notes about this user
	grantedBy: text('grantedBy').references(() => users.id, { onDelete: 'set null' }),
	grantedAt: integer('grantedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	lastAccessAt: integer('lastAccessAt', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})

/**
 * Rate limit tracking table
 * Tracks usage to enforce rate limits during beta
 */
export const rateLimits = sqliteTable('rate_limits', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull(), // e.g., '/agents/:id/chat'
	requestCount: integer('requestCount').notNull().default(0),
	tokenCount: integer('tokenCount').notNull().default(0),
	windowStart: integer('windowStart', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	windowEnd: integer('windowEnd', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => {
			const now = new Date()
			now.setHours(now.getHours() + 1) // 1 hour window
			return now
		}),
	metadata: text('metadata', { mode: 'json' }).$type<{
		lastIp?: string
		lastUserAgent?: string
	}>(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
