import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq, or } from 'drizzle-orm'
import { getDb } from '../db'
import type { Database } from 'web-app/db/types'
import { CreateWorkspaceSchema, ErrorSchema, IdParamSchema, SuccessSchema, UpdateWorkspaceSchema, WorkspaceSchema } from '../schemas'
import { workspaces, workspaceMembers } from 'web-app/db/schema'
import { authMiddleware } from '../middleware'
import { type WorkspaceRole, isWorkspaceRole, type AuthEnv } from '../types'

// Define routes
const listWorkspacesRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Workspaces'],
	summary: 'List all workspaces',
	description: 'Get a list of all workspaces the user has access to',
	responses: {
		200: {
			description: 'List of workspaces',
			content: {
				'application/json': {
					schema: z.object({
						workspaces: z.array(WorkspaceSchema),
					}),
				},
			},
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const createWorkspaceRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Workspaces'],
	summary: 'Create a new workspace',
	description: 'Create a new workspace for organizing agents and resources',
	request: {
		body: {
			content: {
				'application/json': {
					schema: CreateWorkspaceSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Workspace created successfully',
			content: {
				'application/json': {
					schema: WorkspaceSchema,
				},
			},
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Internal server error',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const getWorkspaceRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Workspaces'],
	summary: 'Get workspace by ID',
	description: 'Retrieve a specific workspace by its ID',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Workspace details',
			content: {
				'application/json': {
					schema: WorkspaceSchema,
				},
			},
		},
		403: {
			description: 'Access denied',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Workspace not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const updateWorkspaceRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Workspaces'],
	summary: 'Update workspace',
	description: 'Update an existing workspace',
	request: {
		params: IdParamSchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateWorkspaceSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Workspace updated successfully',
			content: {
				'application/json': {
					schema: WorkspaceSchema,
				},
			},
		},
		403: {
			description: 'Insufficient permissions',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Workspace not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		500: {
			description: 'Internal server error',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

const deleteWorkspaceRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Workspaces'],
	summary: 'Delete workspace',
	description: 'Delete a workspace permanently',
	request: {
		params: IdParamSchema,
	},
	responses: {
		200: {
			description: 'Workspace deleted successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Only owner can delete workspace',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Workspace not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		503: {
			description: 'Service unavailable',
			content: { 'application/json': { schema: ErrorSchema } },
		},
	},
})

/**
 * Get user's role in a workspace.
 * Returns null if user has no access, throws on invalid role.
 */
async function getUserWorkspaceRole(
	userId: string,
	workspaceId: string,
	db: Database
): Promise<WorkspaceRole | null> {
	// Check if user is owner
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))

	if (!workspace) return null
	if (workspace.ownerId === userId) return 'owner'

	// Check membership
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(eq(workspaceMembers.workspaceId, workspaceId))

	if (!membership) return null

	// Validate role from database
	if (!isWorkspaceRole(membership.role)) {
		throw new Error(`Invalid workspace role in database: ${membership.role}`)
	}
	return membership.role
}

// Create app with proper typing (includes Bindings and Variables)
const app = new OpenAPIHono<AuthEnv>()

// Apply middleware
app.use('*', authMiddleware)

// Register routes
app.openapi(listWorkspacesRoute, async (c) => {
	const db = await getDb(c)
	const user = c.get('user')


	// Get workspaces where user is owner
	const ownedWorkspaces = await db.select().from(workspaces).where(eq(workspaces.ownerId, user.id))

	// Get workspaces where user is a member
	const memberships = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, user.id))

	const memberWorkspaceIds = memberships.map((m) => m.workspaceId)
	const memberWorkspaces =
		memberWorkspaceIds.length > 0
			? await db
					.select()
					.from(workspaces)
					.where(or(...memberWorkspaceIds.map((id) => eq(workspaces.id, id))))
			: []

	// Combine and dedupe
	const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces.filter((mw) => !ownedWorkspaces.some((ow) => ow.id === mw.id))]

	const workspacesData = allWorkspaces.map((workspace) => {
		const membership = memberships.find((m) => m.workspaceId === workspace.id)
		let role: WorkspaceRole = 'member'
		if (workspace.ownerId === user.id) {
			role = 'owner'
		} else if (membership?.role && isWorkspaceRole(membership.role)) {
			role = membership.role
		}

		return {
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role,
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		}
	})

	return c.json({ workspaces: workspacesData }, 200)
})

app.openapi(createWorkspaceRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')


	// Generate unique slug
	const baseSlug = data.name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
	let slug = baseSlug
	let counter = 1

	// Check for slug conflicts
	while (true) {
		const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
		if (!existing) break
		slug = `${baseSlug}-${counter++}`
	}

	const [workspace] = await db
		.insert(workspaces)
		.values({
			name: data.name,
			slug,
			description: data.description,
			ownerId: user.id,
		})
		.returning()

	if (!workspace) {
		return c.json({ error: 'Failed to create workspace' }, 500)
	}

	return c.json(
		{
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role: 'owner' as const,
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		},
		201
	)
})

app.openapi(getWorkspaceRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const user = c.get('user')


	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	// Check access
	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Access denied' }, 403)
	}

	return c.json(
		{
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role,
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		},
		200
	)
})

app.openapi(updateWorkspaceRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')


	// Check access - only owner and admin can update
	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Workspace not found' }, 404)
	}
	if (role !== 'owner' && role !== 'admin') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	// Build typed update object using Drizzle's inferred type
	const updateData: Partial<typeof workspaces.$inferInsert> = {
		updatedAt: new Date(),
	}

	if (data.name !== undefined) {
		updateData.name = data.name
		// Update slug if name changes
		const baseSlug = data.name
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
		let slug = baseSlug
		let counter = 1
		while (true) {
			const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
			if (!existing || existing.id === id) break
			slug = `${baseSlug}-${counter++}`
		}
		updateData.slug = slug
	}
	if (data.description !== undefined) updateData.description = data.description

	const [workspace] = await db.update(workspaces).set(updateData).where(eq(workspaces.id, id)).returning()

	if (!workspace) {
		return c.json({ error: 'Failed to update workspace' }, 500)
	}

	return c.json(
		{
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role,
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		},
		200
	)
})

app.openapi(deleteWorkspaceRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const user = c.get('user')


	// Check ownership - only owner can delete
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	if (workspace.ownerId !== user.id) {
		return c.json({ error: 'Only owner can delete workspace' }, 403)
	}

	await db.delete(workspaces).where(eq(workspaces.id, id))

	return c.json({ success: true }, 200)
})

export default app
