import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
	CreateWorkspaceSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateWorkspaceSchema,
	WorkspaceSchema,
} from '../schemas'

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
		// TODO: Get from DB with user filter
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
	})
	.openapi(createWorkspaceRoute, async (c) => {
		const data = c.req.valid('json')
		const now = new Date().toISOString()
		// TODO: Insert to DB
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
	})
	.openapi(getWorkspaceRoute, async (c) => {
		const { id } = c.req.valid('param')
		// TODO: Get from DB with authorization check
		return c.json({
			id,
			name: 'My Workspace',
			description: 'Default workspace',
			role: 'owner' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	})
	.openapi(updateWorkspaceRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		// TODO: Update in DB with authorization check
		return c.json({
			id,
			name: data.name ?? 'My Workspace',
			description: data.description ?? null,
			role: 'owner' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	})
	.openapi(deleteWorkspaceRoute, async (c) => {
		const { id } = c.req.valid('param')
		// TODO: Delete from DB with authorization check
		return c.json({ success: true })
	})

export default app
