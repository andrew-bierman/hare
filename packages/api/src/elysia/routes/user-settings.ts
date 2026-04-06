/**
 * User Settings Routes
 *
 * User preferences management.
 */

import { userPreferences } from '@hare/db/schema'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { authPlugin } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const UpdateUserPreferencesInputSchema = z.object({
	emailNotifications: z.boolean().optional(),
	usageAlerts: z.boolean().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializePreferences(prefs: typeof userPreferences.$inferSelect) {
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
// Routes
// =============================================================================

export const userSettingsRoutes = new Elysia({ prefix: '/user', name: 'user-settings-routes' })
	.use(authPlugin)

	// Get user preferences (creates default if not exists)
	.get(
		'/preferences',
		async ({ db, user }) => {
			let [prefs] = await db
				.select()
				.from(userPreferences)
				.where(eq(userPreferences.userId, user.id))

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

			if (!prefs) throw new Error('Failed to get or create preferences')

			return serializePreferences(prefs)
		},
		{ auth: true },
	)

	// Update user preferences
	.patch(
		'/preferences',
		async ({ db, user, body }) => {
			let [prefs] = await db
				.select()
				.from(userPreferences)
				.where(eq(userPreferences.userId, user.id))

			if (!prefs) {
				;[prefs] = await db
					.insert(userPreferences)
					.values({
						userId: user.id,
						emailNotifications: body.emailNotifications ?? true,
						usageAlerts: body.usageAlerts ?? true,
					})
					.returning()
			} else {
				const updateData: Partial<typeof userPreferences.$inferInsert> = {
					updatedAt: new Date(),
				}

				if (body.emailNotifications !== undefined) {
					updateData.emailNotifications = body.emailNotifications
				}
				if (body.usageAlerts !== undefined) {
					updateData.usageAlerts = body.usageAlerts
				}

				;[prefs] = await db
					.update(userPreferences)
					.set(updateData)
					.where(eq(userPreferences.userId, user.id))
					.returning()
			}

			if (!prefs) throw new Error('Failed to update preferences')

			return serializePreferences(prefs)
		},
		{ auth: true, body: UpdateUserPreferencesInputSchema },
	)
