import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq, or } from 'drizzle-orm'
import { workspaceMembers, workspaces } from 'web-app/db/schema'
import type { Database } from 'web-app/db/types'
import { generateUniqueSlug } from 'web-app/lib/utils'
import { getDb } from '../db'
import { commonResponses, requireAdminAccess } from '../helpers'
import { authMiddleware } from '../middleware'
import {
	CreateWorkspaceSchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateWorkspaceSchema,
	WorkspaceSchema,
} from '../schemas'
import { serializeWorkspace } from '../serializers'
import { type AuthEnv, isWorkspaceRole, type WorkspaceRole } from '../types'

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
		...commonResponses,
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
		500: {
			description: 'Failed to create workspace',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
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
		...commonResponses,
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
			description: 'Admin access required',
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
			description: 'Failed to update workspace',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
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
		...commonResponses,
	},
})

/**
 * Get user's role in a workspace.
 * Returns null if user has no access.
 */
async function getUserWorkspaceRole(
	userId: string,
	workspaceId: string,
	db: Database,
): Promise<WorkspaceRole | null> {
	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))

	if (!workspace) return null
	if (workspace.ownerId === userId) return 'owner'

	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(eq(workspaceMembers.workspaceId, workspaceId))

	if (!membership) return null

	if (!isWorkspaceRole(membership.role)) {
		throw new Error(`Invalid workspace role in database: ${membership.role}`)
	}
	return membership.role
}

/**
 * Check if a slug exists in the database.
 */
async function slugExists(db: Database, slug: string, excludeId?: string): Promise<boolean> {
	const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
	return !!existing && existing.id !== excludeId
}

// Create app with proper typing
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
	const memberships = await db
		.select()
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, user.id))

	const memberWorkspaceIds = memberships.map((m) => m.workspaceId)
	const memberWorkspaces =
		memberWorkspaceIds.length > 0
			? await db
					.select()
					.from(workspaces)
					.where(or(...memberWorkspaceIds.map((id) => eq(workspaces.id, id))))
			: []

	// Combine and dedupe
	const allWorkspaces = [
		...ownedWorkspaces,
		...memberWorkspaces.filter((mw) => !ownedWorkspaces.some((ow) => ow.id === mw.id)),
	]

	const workspacesData = allWorkspaces.map((workspace) => {
		const membership = memberships.find((m) => m.workspaceId === workspace.id)
		let role: WorkspaceRole = 'member'
		if (workspace.ownerId === user.id) {
			role = 'owner'
		} else if (membership?.role && isWorkspaceRole(membership.role)) {
			role = membership.role
		}

		return serializeWorkspace(workspace, role)
	})

	return c.json({ workspaces: workspacesData }, 200)
})

app.openapi(createWorkspaceRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')

	const slug = await generateUniqueSlug(data.name, (s) => slugExists(db, s))

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

	return c.json(serializeWorkspace(workspace, 'owner'), 201)
})

app.openapi(getWorkspaceRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const user = c.get('user')

	const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

	if (!workspace) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Access denied' }, 403)
	}

	return c.json(serializeWorkspace(workspace, role), 200)
})

app.openapi(updateWorkspaceRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')

	const role = await getUserWorkspaceRole(user.id, id, db)
	if (!role) {
		return c.json({ error: 'Workspace not found' }, 404)
	}

	requireAdminAccess(role)

	const updateData: Partial<typeof workspaces.$inferInsert> = {
		updatedAt: new Date(),
	}

	if (data.name !== undefined) {
		updateData.name = data.name
		updateData.slug = await generateUniqueSlug(data.name, (s) => slugExists(db, s, id))
	}
	if (data.description !== undefined) {
		updateData.description = data.description
	}

	const [workspace] = await db
		.update(workspaces)
		.set(updateData)
		.where(eq(workspaces.id, id))
		.returning()

	if (!workspace) {
		return c.json({ error: 'Failed to update workspace' }, 500)
	}

	return c.json(serializeWorkspace(workspace, role), 200)
})

app.openapi(deleteWorkspaceRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const user = c.get('user')

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
