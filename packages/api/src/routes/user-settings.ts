import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { userPreferences } from '@hare/db/schema'
import { getDb } from '../db'
import { commonResponses, ErrorSchema } from '../helpers'
import { authMiddleware } from '../middleware'
import type { AuthEnv } from '@hare/types'

/**
 * User preferences schema for API responses.
 */
const UserPreferencesSchema = z
	.object({
		id: z.string(),
		userId: z.string(),
		emailNotifications: z.boolean(),
		usageAlerts: z.boolean(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi('UserPreferences')

/**
 * Update user preferences schema.
 */
const UpdateUserPreferencesSchema = z
	.object({
		emailNotifications: z.boolean().optional(),
		usageAlerts: z.boolean().optional(),
	})
	.openapi('UpdateUserPreferences')

// Define routes
const getUserPreferencesRoute = createRoute({
	method: 'get',
	path: '/preferences',
	tags: ['User Settings'],
	summary: 'Get user preferences',
	description: 'Get the current user notification and display preferences',
	responses: {
		200: {
			description: 'User preferences',
			content: {
				'application/json': {
					schema: UserPreferencesSchema,
				},
			},
		},
		...commonResponses,
	},
})

const updateUserPreferencesRoute = createRoute({
	method: 'patch',
	path: '/preferences',
	tags: ['User Settings'],
	summary: 'Update user preferences',
	description: 'Update the current user notification and display preferences',
	request: {
		body: {
			content: {
				'application/json': {
					schema: UpdateUserPreferencesSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Preferences updated successfully',
			content: {
				'application/json': {
					schema: UserPreferencesSchema,
				},
			},
		},
		500: {
			description: 'Failed to update preferences',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

/**
 * Serialize user preferences for API response.
 */
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

// Create app with proper typing
const baseApp = new OpenAPIHono<AuthEnv>()

// Apply middleware
baseApp.use('*', authMiddleware)

// Get user preferences - creates default if not exists
const app = baseApp.openapi(getUserPreferencesRoute, async (c) => {
	const db = getDb(c)
	const user = c.get('user')

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

	return c.json(serializePreferences(prefs), 200)
})
// Update user preferences
.openapi(updateUserPreferencesRoute, async (c) => {
	const data = c.req.valid('json')
	const db = getDb(c)
	const user = c.get('user')

	// Try to find existing preferences
	let [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id))

	if (!prefs) {
		// Create new preferences with provided values
		;[prefs] = await db
			.insert(userPreferences)
			.values({
				userId: user.id,
				emailNotifications: data.emailNotifications ?? true,
				usageAlerts: data.usageAlerts ?? true,
			})
			.returning()
	} else {
		// Update existing preferences
		const updateData: Partial<typeof userPreferences.$inferInsert> = {
			updatedAt: new Date(),
		}

		if (data.emailNotifications !== undefined) {
			updateData.emailNotifications = data.emailNotifications
		}
		if (data.usageAlerts !== undefined) {
			updateData.usageAlerts = data.usageAlerts
		}

		;[prefs] = await db
			.update(userPreferences)
			.set(updateData)
			.where(eq(userPreferences.userId, user.id))
			.returning()
	}

	if (!prefs) {
		return c.json({ error: 'Failed to update preferences' }, 500)
	}

	return c.json(serializePreferences(prefs), 200)
})

export default app
