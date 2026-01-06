/**
 * oRPC User Settings Router
 *
 * Handles user preferences with full type safety.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { userPreferences } from '@hare/db/schema'
import { authedProcedure, serverError, type AuthContext } from '../base'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

const UserPreferencesSchema = z.object({
	id: z.string(),
	userId: z.string(),
	emailNotifications: z.boolean(),
	usageAlerts: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

const UpdateUserPreferencesInputSchema = z.object({
	emailNotifications: z.boolean().optional(),
	usageAlerts: z.boolean().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializePreferences(prefs: typeof userPreferences.$inferSelect): z.infer<typeof UserPreferencesSchema> {
	return {
		id: prefs.id,
		userId: prefs.userId,
		emailNotifications: prefs.emailNotifications,
		usageAlerts: prefs.usageAlerts,
		createdAt: prefs.createdAt.toISOString(),
		updatedAt: prefs.updatedAt.toISOString(),
	}
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * Get user preferences (creates default if not exists)
 */
export const get = authedProcedure
	.route({ method: 'GET', path: '/user/preferences' })
	.output(UserPreferencesSchema)
	.handler(async ({ context }) => {
		const { db, user } = context

		// Try to find existing preferences
		let [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id))

		// Create default preferences if not found
		if (!prefs) {
			;[prefs] = await db
				.insert(userPreferences)
				.values({
					userId: user.id,
					emailNotifications: true,
					usageAlerts: true,
				})
				.returning()
		}

		if (!prefs) serverError('Failed to get or create preferences')

		return serializePreferences(prefs)
	})

/**
 * Update user preferences
 */
export const update = authedProcedure
	.route({ method: 'PATCH', path: '/user/preferences' })
	.input(UpdateUserPreferencesInputSchema)
	.output(UserPreferencesSchema)
	.handler(async ({ input, context }) => {
		const { db, user } = context

		// Try to find existing preferences
		let [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id))

		if (!prefs) {
			// Create new preferences with provided values
			;[prefs] = await db
				.insert(userPreferences)
				.values({
					userId: user.id,
					emailNotifications: input.emailNotifications ?? true,
					usageAlerts: input.usageAlerts ?? true,
				})
				.returning()
		} else {
			// Update existing preferences
			const updateData: Partial<typeof userPreferences.$inferInsert> = {
				updatedAt: new Date(),
			}

			if (input.emailNotifications !== undefined) {
				updateData.emailNotifications = input.emailNotifications
			}
			if (input.usageAlerts !== undefined) {
				updateData.usageAlerts = input.usageAlerts
			}

			;[prefs] = await db
				.update(userPreferences)
				.set(updateData)
				.where(eq(userPreferences.userId, user.id))
				.returning()
		}

		if (!prefs) serverError('Failed to update preferences')

		return serializePreferences(prefs)
	})

// =============================================================================
// Router Export
// =============================================================================

export const userSettingsRouter = {
	get,
	update,
}
