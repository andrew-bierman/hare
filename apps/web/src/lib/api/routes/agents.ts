import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { agents, agentTools, deployments } from 'web-app/db/schema'
import { getDb } from '../db'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import {
	AgentSchema,
	CreateAgentSchema,
	DeployAgentSchema,
	DeploymentSchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateAgentSchema,
} from '../schemas'
import type { WorkspaceEnv } from '../types'

// Define routes
const listAgentsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Agents'],
	summary: 'List all agents',
	description: 'Get a list of all agents in the workspace',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID to filter agents'),
		}),
	},
	responses: {
		200: {
			description: 'List of agents',
			content: {
				'application/json': {
					schema: z.object({
						agents: z.array(AgentSchema),
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

const createAgentRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Agents'],
	summary: 'Create a new agent',
	description: 'Create a new AI agent with the specified configuration',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: CreateAgentSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Agent created successfully',
			content: {
				'application/json': {
					schema: AgentSchema,
				},
			},
		},
		401: {
			description: 'Unauthorized',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden',
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

const getAgentRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Agents'],
	summary: 'Get agent by ID',
	description: 'Retrieve a specific agent by its ID',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Agent details',
			content: {
				'application/json': {
					schema: AgentSchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
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

const updateAgentRoute = createRoute({
	method: 'patch',
	path: '/{id}',
	tags: ['Agents'],
	summary: 'Update agent',
	description: 'Update an existing agent configuration',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: UpdateAgentSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Agent updated successfully',
			content: {
				'application/json': {
					schema: AgentSchema,
				},
			},
		},
		403: {
			description: 'Forbidden',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
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

const deleteAgentRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Agents'],
	summary: 'Delete agent',
	description: 'Delete an agent permanently',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Agent deleted successfully',
			content: {
				'application/json': {
					schema: SuccessSchema,
				},
			},
		},
		403: {
			description: 'Forbidden',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
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

const deployAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/deploy',
	tags: ['Agents'],
	summary: 'Deploy agent',
	description: 'Deploy an agent to production',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: DeployAgentSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Agent deployed successfully',
			content: {
				'application/json': {
					schema: DeploymentSchema,
				},
			},
		},
		400: {
			description: 'Agent not ready for deployment',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		403: {
			description: 'Forbidden',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
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

/**
 * Get tool IDs attached to an agent.
 */
async function getAgentToolIds(
	agentId: string,
	db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<string[]> {
	const rows = await db
		.select({ toolId: agentTools.toolId })
		.from(agentTools)
		.where(eq(agentTools.agentId, agentId))
	return rows.map((r) => r.toolId)
}

// Create app with proper typing (includes Bindings and Variables)
const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// Register routes
app.openapi(listAgentsRoute, async (c) => {
	const db = await getDb(c)
	const workspace = c.get('workspace')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	const results = await db.select().from(agents).where(eq(agents.workspaceId, workspace.id))

	// Get tool IDs for each agent
	const agentsData = await Promise.all(
		results.map(async (agent) => ({
			id: agent.id,
			workspaceId: agent.workspaceId,
			name: agent.name,
			description: agent.description,
			model: agent.model,
			instructions: agent.instructions || '',
			config: agent.config || undefined,
			status: agent.status,
			toolIds: await getAgentToolIds(agent.id, db),
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		})),
	)

	return c.json({ agents: agentsData }, 200)
})

app.openapi(createAgentRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check write permission
	if (role === 'viewer') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	const [agent] = await db
		.insert(agents)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description,
			model: data.model,
			instructions: data.instructions,
			config: data.config,
			createdBy: user.id,
		})
		.returning()

	if (!agent) {
		return c.json({ error: 'Failed to create agent' }, 500)
	}

	// Attach tools if provided
	if (data.toolIds && data.toolIds.length > 0) {
		await db.insert(agentTools).values(
			data.toolIds.map((toolId: string) => ({
				agentId: agent.id,
				toolId,
			})),
		)
	}

	return c.json(
		{
			id: agent.id,
			workspaceId: agent.workspaceId,
			name: agent.name,
			description: agent.description,
			model: agent.model,
			instructions: agent.instructions || '',
			config: agent.config || undefined,
			status: agent.status,
			toolIds: data.toolIds || [],
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		},
		201,
	)
})

app.openapi(getAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Verify agent belongs to workspace
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspace.id)))

	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const toolIds = await getAgentToolIds(agent.id, db)

	return c.json(
		{
			id: agent.id,
			workspaceId: agent.workspaceId,
			name: agent.name,
			description: agent.description,
			model: agent.model,
			instructions: agent.instructions || '',
			config: agent.config || undefined,
			status: agent.status,
			toolIds,
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		},
		200,
	)
})

app.openapi(updateAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check write permission
	if (role === 'viewer') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	// Verify agent belongs to workspace
	const [existing] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspace.id)))

	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Build typed update object using Drizzle's inferred type
	const updateData: Partial<typeof agents.$inferInsert> = {
		updatedAt: new Date(),
		...(data.name !== undefined && { name: data.name }),
		...(data.description !== undefined && { description: data.description }),
		...(data.model !== undefined && { model: data.model }),
		...(data.instructions !== undefined && { instructions: data.instructions }),
		...(data.config !== undefined && { config: data.config }),
		...(data.status !== undefined && { status: data.status }),
	}

	const [agent] = await db.update(agents).set(updateData).where(eq(agents.id, id)).returning()

	if (!agent) {
		return c.json({ error: 'Failed to update agent' }, 500)
	}

	// Update tool attachments if provided
	if (data.toolIds !== undefined) {
		// Remove existing attachments
		await db.delete(agentTools).where(eq(agentTools.agentId, id))

		// Add new attachments
		if (data.toolIds.length > 0) {
			await db.insert(agentTools).values(
				data.toolIds.map((toolId: string) => ({
					agentId: id,
					toolId,
				})),
			)
		}
	}

	const toolIds = await getAgentToolIds(id, db)

	return c.json(
		{
			id: agent.id,
			workspaceId: agent.workspaceId,
			name: agent.name,
			description: agent.description,
			model: agent.model,
			instructions: agent.instructions || '',
			config: agent.config || undefined,
			status: agent.status,
			toolIds,
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		},
		200,
	)
})

app.openapi(deleteAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check admin permission for delete
	if (role !== 'owner' && role !== 'admin') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	// Verify agent belongs to workspace
	const result = await db
		.delete(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspace.id)))
		.returning()

	if (result.length === 0) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	return c.json({ success: true }, 200)
})

app.openapi(deployAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	if (!db) {
		return c.json({ error: 'Service unavailable' }, 503)
	}

	// Check admin permission for deploy
	if (role !== 'owner' && role !== 'admin') {
		return c.json({ error: 'Insufficient permissions' }, 403)
	}

	// Verify agent belongs to workspace
	const [existing] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspace.id)))

	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Validate agent is ready for deployment
	if (!existing.instructions) {
		return c.json({ error: 'Agent must have instructions before deployment' }, 400)
	}

	// Update agent status to 'deployed'
	await db
		.update(agents)
		.set({
			status: 'deployed',
			updatedAt: new Date(),
		})
		.where(eq(agents.id, id))

	// Create deployment record
	const version = data.version || '1.0.0'
	const [deployment] = await db
		.insert(deployments)
		.values({
			agentId: id,
			version,
			status: 'active',
			deployedBy: user.id,
			metadata: existing.config ? { config: existing.config } : undefined,
		})
		.returning()

	if (!deployment) {
		return c.json({ error: 'Failed to create deployment' }, 500)
	}

	return c.json(
		{
			id: deployment.id,
			status: 'deployed' as const,
			deployedAt: deployment.deployedAt.toISOString(),
			version,
		},
		200,
	)
})

export default app
