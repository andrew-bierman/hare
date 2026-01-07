/**
 * oRPC Workspaces Router
 *
 * Handles workspace management with full type safety.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { workspaces, workspaceMembers } from '@hare/db/schema'
import { config } from '@hare/config'
import {
	authedProcedure,
	requireWrite,
	requireOwner,
	notFound,
	badRequest,
	serverError,
	type WorkspaceContext,
	type AuthContext,
} from '../base'
import { SuccessSchema, IdParamSchema } from '../../schemas'

// Define inline schemas that match actual DB structure
const WorkspaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

const CreateWorkspaceInputSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
	description: z.string().max(500).optional(),
})

const UpdateWorkspaceInputSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializeWorkspace(
	workspace: typeof workspaces.$inferSelect,
): z.infer<typeof WorkspaceSchema> {
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
// Procedures
// =============================================================================

/**
 * List all workspaces user has access to
 */
export const list = authedProcedure
	.route({ method: 'GET', path: '/workspaces' })
	.output(z.object({ workspaces: z.array(WorkspaceSchema) }))
	.handler(async ({ context }) => {
		const { db, user } = context

		// Get workspaces where user is a member
		const memberships = await db
			.select({ workspace: workspaces })
			.from(workspaceMembers)
			.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
			.where(eq(workspaceMembers.userId, user.id))

		return {
			workspaces: memberships.map((m) => serializeWorkspace(m.workspace)),
		}
	})

/**
 * Get current workspace (from context)
 */
export const getCurrent = requireWrite
	.route({ method: 'GET', path: '/workspaces/current' })
	.output(WorkspaceSchema)
	.handler(async ({ context }) => {
		const { db, workspaceId } = context

		const [workspace] = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, workspaceId))

		if (!workspace) notFound('Workspace not found')

		return serializeWorkspace(workspace)
	})

/**
 * Get workspace by ID
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/workspaces/{id}' })
	.input(IdParamSchema)
	.output(WorkspaceSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const [workspace] = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, input.id))

		if (!workspace) notFound('Workspace not found')

		return serializeWorkspace(workspace)
	})

/**
 * Create new workspace
 */
export const create = authedProcedure
	.route({ method: 'POST', path: '/workspaces', successStatus: 201 })
	.input(CreateWorkspaceInputSchema)
	.output(WorkspaceSchema)
	.handler(async ({ input, context }) => {
		const { db, user } = context

		// Check if slug is already taken
		const [existing] = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.slug, input.slug))

		if (existing) {
			badRequest('Workspace slug is already taken')
		}

		const [workspace] = await db
			.insert(workspaces)
			.values({
				name: input.name,
				slug: input.slug,
				description: input.description,
				ownerId: user.id,
			})
			.returning()

		if (!workspace) serverError('Failed to create workspace')

		// Add creator as owner
		await db.insert(workspaceMembers).values({
			workspaceId: workspace.id,
			userId: user.id,
			role: config.enums.workspaceRole.OWNER,
		})

		return serializeWorkspace(workspace)
	})

/**
 * Update workspace
 */
export const update = requireOwner
	.route({ method: 'PATCH', path: '/workspaces/{id}' })
	.input(IdParamSchema.merge(UpdateWorkspaceInputSchema))
	.output(WorkspaceSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db } = context

		const updateData: Partial<typeof workspaces.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
		}

		const [workspace] = await db
			.update(workspaces)
			.set(updateData)
			.where(eq(workspaces.id, id))
			.returning()

		if (!workspace) notFound('Workspace not found')

		return serializeWorkspace(workspace)
	})

/**
 * Delete workspace
 */
export const remove = requireOwner
	.route({ method: 'DELETE', path: '/workspaces/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db } = context

		const result = await db
			.delete(workspaces)
			.where(eq(workspaces.id, input.id))
			.returning()

		if (result.length === 0) notFound('Workspace not found')

		return { success: true }
	})

/**
 * Ensure default workspace exists (idempotent)
 * Creates a default workspace if user has none
 */
export const ensureDefault = authedProcedure
	.route({ method: 'POST', path: '/workspaces/ensure-default' })
	.output(WorkspaceSchema)
	.handler(async ({ context }) => {
		const { db, user } = context

		// Check if user already has a workspace
		const memberships = await db
			.select({ workspace: workspaces })
			.from(workspaceMembers)
			.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
			.where(eq(workspaceMembers.userId, user.id))
			.limit(1)

		if (memberships.length > 0 && memberships[0]) {
			return serializeWorkspace(memberships[0].workspace)
		}

		// Create default workspace
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

		if (!workspace) serverError('Failed to create workspace')

		// Add creator as owner
		await db.insert(workspaceMembers).values({
			workspaceId: workspace.id,
			userId: user.id,
			role: config.enums.workspaceRole.OWNER,
		})

		return serializeWorkspace(workspace)
	})

// =============================================================================
// Router Export
// =============================================================================

export const workspacesRouter = {
	list,
	getCurrent,
	get,
	create,
	update,
	delete: remove,
	ensureDefault,
}
