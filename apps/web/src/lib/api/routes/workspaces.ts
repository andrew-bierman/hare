import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import {
	CreateWorkspaceSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateWorkspaceSchema,
	WorkspaceSchema,
} from '../schemas'
import { workspaces } from 'web-app/db/schema'

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
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(listWorkspacesRoute, async (c) => {
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({
				workspaces: [
					{
						id: 'ws_xxx',
						name: 'My Workspace',
						description: 'Default workspace',
						role: 'owner' as const,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				],
			})
		}

		// TODO: Get from DB with user filter
		const results = await db.select().from(workspaces)

		const workspacesData = results.map((workspace) => ({
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role: 'owner' as const, // TODO: Get actual role from workspace_members join
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		}))

		return c.json({ workspaces: workspacesData })
	})
	.openapi(createWorkspaceRoute, async (c) => {
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			const now = new Date().toISOString()
			return c.json(
				{
					id: `ws_${crypto.randomUUID().slice(0, 8)}`,
					name: data.name,
					description: data.description ?? null,
					role: 'owner' as const,
					createdAt: now,
					updatedAt: now,
				},
				201,
			)
		}

		// TODO: Get actual user ID from authentication context
		const userId = 'user_default'

		const [workspace] = await db
			.insert(workspaces)
			.values({
				name: data.name,
				slug: data.name.toLowerCase().replace(/\s+/g, '-'),
				description: data.description,
				ownerId: userId,
			})
			.returning()

		return c.json(
			{
				id: workspace.id,
				name: workspace.name,
				description: workspace.description,
				role: 'owner' as const,
				createdAt: workspace.createdAt.toISOString(),
				updatedAt: workspace.updatedAt.toISOString(),
			},
			201,
		)
	})
	.openapi(getWorkspaceRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({
				id,
				name: 'My Workspace',
				description: 'Default workspace',
				role: 'owner' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		}

		// TODO: Add authorization check
		const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))

		if (!workspace) {
			return c.json({ error: 'Workspace not found' }, 404)
		}

		return c.json({
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role: 'owner' as const, // TODO: Get actual role from workspace_members join
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		})
	})
	.openapi(updateWorkspaceRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({
				id,
				name: data.name ?? 'My Workspace',
				description: data.description ?? null,
				role: 'owner' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		}

		// TODO: Add authorization check
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (data.name !== undefined) {
			updateData.name = data.name
			updateData.slug = data.name.toLowerCase().replace(/\s+/g, '-')
		}
		if (data.description !== undefined) updateData.description = data.description

		const [workspace] = await db
			.update(workspaces)
			.set(updateData)
			.where(eq(workspaces.id, id))
			.returning()

		if (!workspace) {
			return c.json({ error: 'Workspace not found' }, 404)
		}

		return c.json({
			id: workspace.id,
			name: workspace.name,
			description: workspace.description,
			role: 'owner' as const, // TODO: Get actual role from workspace_members join
			createdAt: workspace.createdAt.toISOString(),
			updatedAt: workspace.updatedAt.toISOString(),
		})
	})
	.openapi(deleteWorkspaceRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)

		// Return success for development/testing when DB not available
		if (!db) {
			return c.json({ success: true })
		}

		// TODO: Add authorization check
		const result = await db.delete(workspaces).where(eq(workspaces.id, id)).returning()

		if (result.length === 0) {
			return c.json({ error: 'Workspace not found' }, 404)
		}

		return c.json({ success: true })
	})

export default app
