import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { agents, agentTools, deployments } from 'web-app/db/schema'
import type { Database } from 'web-app/db/types'
import { getCloudflareEnv, getDb } from '../db'
import { commonResponses, requireAdminAccess, requireWriteAccess } from '../helpers'
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
import { serializeAgent } from '../serializers'
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
		...commonResponses,
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
		403: {
			description: 'Write access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		500: {
			description: 'Failed to create agent',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
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
		...commonResponses,
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
			description: 'Write access required',
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
			description: 'Failed to update agent',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
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
			description: 'Admin access required',
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
		...commonResponses,
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
			description: 'Admin access required',
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
			description: 'Failed to create deployment',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

/**
 * Input for getting agent tool IDs.
 */
interface GetAgentToolIdsInput {
	agentId: string
	db: Database
}

/**
 * Get tool IDs attached to an agent.
 */
async function getAgentToolIds(input: GetAgentToolIdsInput): Promise<string[]> {
	const { agentId, db } = input
	const rows = await db
		.select({ toolId: agentTools.toolId })
		.from(agentTools)
		.where(eq(agentTools.agentId, agentId))
	return rows.map((r) => r.toolId)
}

/**
 * Find an agent by ID and workspace, or return null.
 */
async function findAgentByIdAndWorkspace(
	db: Database,
	id: string,
	workspaceId: string,
) {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

// Create app with proper typing
const app = new OpenAPIHono<WorkspaceEnv>()

// Apply middleware
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// Register routes
app.openapi(listAgentsRoute, async (c) => {
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const results = await db.select().from(agents).where(eq(agents.workspaceId, workspace.id))

	const agentsData = await Promise.all(
		results.map(async (agent) =>
			serializeAgent(agent, await getAgentToolIds({ agentId: agent.id, db })),
		),
	)

	return c.json({ agents: agentsData }, 200)
})

app.openapi(createAgentRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

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

	// Attach tools if provided (filter out system tools which don't exist in DB)
	if (data.toolIds && data.toolIds.length > 0) {
		const customToolIds = data.toolIds.filter((id: string) => !id.startsWith('system-'))
		if (customToolIds.length > 0) {
			await db.insert(agentTools).values(
				customToolIds.map((toolId: string) => ({
					agentId: agent.id,
					toolId,
				})),
			)
		}
	}

	return c.json(serializeAgent(agent, data.toolIds || []), 201)
})

app.openapi(getAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const agent = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const toolIds = await getAgentToolIds({ agentId: agent.id, db })
	return c.json(serializeAgent(agent, toolIds), 200)
})

app.openapi(updateAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireWriteAccess(role)

	const existing = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Build typed update object
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

	// Update tool attachments if provided (filter out system tools which don't exist in DB)
	if (data.toolIds !== undefined) {
		await db.delete(agentTools).where(eq(agentTools.agentId, id))

		// Add new attachments (only custom tools, not system tools)
		const customToolIds = data.toolIds.filter((toolId: string) => !toolId.startsWith('system-'))
		if (customToolIds.length > 0) {
			await db.insert(agentTools).values(
				customToolIds.map((toolId: string) => ({
					agentId: id,
					toolId,
				})),
			)
		}
	}

	const toolIds = await getAgentToolIds({ agentId: id, db })
	return c.json(serializeAgent(agent, toolIds), 200)
})

app.openapi(deleteAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

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
	const env = await getCloudflareEnv(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	const existing = await findAgentByIdAndWorkspace(db, id, workspace.id)
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (!existing.instructions) {
		return c.json({ error: 'Agent must have instructions before deployment' }, 400)
	}

	// Get Durable Object namespace
	const HARE_AGENT = env.HARE_AGENT as DurableObjectNamespace

	// Create Durable Object ID from agent ID (globally unique)
	const durableObjectId = HARE_AGENT.idFromName(existing.id)
	const durableObjectStub = HARE_AGENT.get(durableObjectId)

	// Initialize Durable Object with agent configuration
	const initResponse = await durableObjectStub.fetch('https://internal/initialize', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			id: existing.id,
			name: existing.name,
			description: existing.description,
			instructions: existing.instructions,
			model: existing.model,
			workspaceId: existing.workspaceId,
			config: existing.config,
		}),
	})

	if (!initResponse.ok) {
		const error = await initResponse.json()
		return c.json({ error: 'Failed to initialize Durable Object', details: error }, 500)
	}

	// Update agent status to 'deployed'
	await db
		.update(agents)
		.set({
			status: 'deployed',
			updatedAt: new Date(),
		})
		.where(eq(agents.id, id))

	const version = data.version || '1.0.0'
	const [deployment] = await db
		.insert(deployments)
		.values({
			agentId: id,
			version,
			status: 'active',
			deployedBy: user.id,
			metadata: {
				durableObjectId: durableObjectId.toString(),
				config: existing.config,
			},
		})
		.returning()

	if (!deployment) {
		return c.json({ error: 'Failed to create deployment' }, 500)
	}

	// Get agent endpoint URL
	const baseUrl = c.req.url.split('/api')[0]
	const agentEndpoint = `${baseUrl}/api/agents/${existing.id}/do`

	return c.json(
		{
			id: deployment.id,
			status: 'deployed' as const,
			deployedAt: deployment.deployedAt.toISOString(),
			version,
			endpoint: agentEndpoint,
			websocketEndpoint: agentEndpoint.replace('https://', 'wss://') + '/ws',
		},
		200,
	)
})

// New route: interact with Durable Object agents
app.post('/agents/:id/do/*', async (c) => {
	const { id: agentId } = c.req.param()
	const action = c.req.param('*') || 'chat'
	const env = await getCloudflareEnv(c)

	// Get Durable Object
	const HARE_AGENT = env.HARE_AGENT as DurableObjectNamespace
	const durableObjectId = HARE_AGENT.idFromName(agentId)
	const durableObjectStub = HARE_AGENT.get(durableObjectId)

	// Forward request to Durable Object
	const targetUrl = `https://internal/${action}`
	const response = await durableObjectStub.fetch(targetUrl, {
		method: c.req.method,
		headers: c.req.raw.headers,
		body: c.req.raw.body,
	})

	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	})
})

export default app
