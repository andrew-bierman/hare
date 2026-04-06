/**
 * Workspace Routes
 *
 * CRUD operations for workspaces.
 */

import { config } from '@hare/config'
import { workspaceMembers, workspaces } from '@hare/db/schema'
import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { authPlugin, ownerPlugin, writePlugin } from '../context'

// =============================================================================
// Schemas
// =============================================================================

const CreateWorkspaceSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z
		.string()
		.min(1)
		.max(50)
		.regex(/^[a-z0-9-]+$/),
	description: z.string().max(500).optional(),
})

const UpdateWorkspaceSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializeWorkspace(workspace: typeof workspaces.$inferSelect) {
	return {
		id: workspace.id,
		name: workspace.name,
		slug: workspace.slug,
		description: workspace.description,
		createdAt: workspace.createdAt.toISOString(),
		updatedAt: workspace.updatedAt.toISOString(),
	}
}

// =============================================================================
// Routes
// =============================================================================

export const workspaceRoutes = new Elysia({ prefix: '/workspaces', name: 'workspace-routes' })
	// List workspaces user has access to
	.use(authPlugin)
	.get(
		'/',
		async ({ db, user }) => {
			const memberships = await db
				.select({ workspace: workspaces })
				.from(workspaceMembers)
				.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
				.where(eq(workspaceMembers.userId, user.id))

			return { workspaces: memberships.map((m) => serializeWorkspace(m.workspace)) }
		},
		{ auth: true },
	)

	// Create workspace
	.post(
		'/',
		async ({ db, user, body }) => {
			const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, body.slug))
			if (existing) {
				throw new Error('Workspace slug is already taken')
			}

			const [workspace] = await db
				.insert(workspaces)
				.values({
					name: body.name,
					slug: body.slug,
					description: body.description,
					ownerId: user.id,
				})
				.returning()

			if (!workspace) throw new Error('Failed to create workspace')

			await db.insert(workspaceMembers).values({
				workspaceId: workspace.id,
				userId: user.id,
				role: config.enums.workspaceRole.OWNER,
			})

			return serializeWorkspace(workspace)
		},
		{
			auth: true,
			body: CreateWorkspaceSchema,
		},
	)

	// Ensure default workspace
	.post(
		'/ensure-default',
		async ({ db, user }) => {
			const memberships = await db
				.select({ workspace: workspaces })
				.from(workspaceMembers)
				.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
				.where(eq(workspaceMembers.userId, user.id))
				.limit(1)

			if (memberships.length > 0 && memberships[0]) {
				return serializeWorkspace(memberships[0].workspace)
			}

			const slug = `${user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}-${Date.now()}`
			const [workspace] = await db
				.insert(workspaces)
				.values({
					name: `${user.name || 'My'}'s Workspace`,
					slug,
					description: 'Default workspace',
					ownerId: user.id,
				})
				.returning()

			if (!workspace) throw new Error('Failed to create workspace')

			await db.insert(workspaceMembers).values({
				workspaceId: workspace.id,
				userId: user.id,
				role: config.enums.workspaceRole.OWNER,
			})

			return serializeWorkspace(workspace)
		},
		{ auth: true },
	)

	// Get current workspace
	.use(writePlugin)
	.get(
		'/current',
		async ({ db, workspaceId }) => {
			const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
			if (!workspace) return status(404, { error: 'Workspace not found' })
			return serializeWorkspace(workspace)
		},
		{ writeAccess: true },
	)

	// Get workspace by ID
	.get(
		'/:id',
		async ({ db, params }) => {
			const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, params.id))
			if (!workspace) return status(404, { error: 'Workspace not found' })
			return serializeWorkspace(workspace)
		},
		{ writeAccess: true },
	)

	// Update workspace
	.use(ownerPlugin)
	.patch(
		'/:id',
		async ({ db, params, body }) => {
			const updateData: Partial<typeof workspaces.$inferInsert> = {
				updatedAt: new Date(),
				...(body.name !== undefined && { name: body.name }),
				...(body.description !== undefined && { description: body.description }),
			}

			const [workspace] = await db
				.update(workspaces)
				.set(updateData)
				.where(eq(workspaces.id, params.id))
				.returning()

			if (!workspace) return status(404, { error: 'Workspace not found' })
			return serializeWorkspace(workspace)
		},
		{
			ownerAccess: true,
			body: UpdateWorkspaceSchema,
		},
	)

	// Delete workspace
	.delete(
		'/:id',
		async ({ db, params }) => {
			const result = await db.delete(workspaces).where(eq(workspaces.id, params.id)).returning()
			if (result.length === 0) return status(404, { error: 'Workspace not found' })
			return { success: true }
		},
		{ ownerAccess: true },
	)
