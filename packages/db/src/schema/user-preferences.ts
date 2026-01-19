import { createId } from '../id'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './auth'

/**
 * User preferences table - stores user-specific settings and preferences.
 *
 * This includes notification preferences, display settings, and other
 * user-configurable options that are not part of the core auth system.
 */
export const userPreferences = sqliteTable('user_preferences', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text('userId')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	// Notification preferences
	emailNotifications: integer('emailNotifications', { mode: 'boolean' }).notNull().default(true),
	usageAlerts: integer('usageAlerts', { mode: 'boolean' }).notNull().default(true),
	// Onboarding preferences
	tourCompleted: integer('tourCompleted', { mode: 'boolean' }).notNull().default(false),
	// Timestamps
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
})
