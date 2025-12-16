import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import {
	AgentSchema,
	CreateAgentSchema,
	DeployAgentSchema,
	DeploymentSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateAgentSchema,
} from '../schemas'
import { agents } from 'web-app/db/schema'

// Define routes
const listAgentsRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Agents'],
	summary: 'List all agents',
	description: 'Get a list of all agents in the workspace',
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
	},
})

const createAgentRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Agents'],
	summary: 'Create a new agent',
	description: 'Create a new AI agent with the specified configuration',
	request: {
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
	},
})

// Create app and register routes
const app = new OpenAPIHono()
	.openapi(listAgentsRoute, async (c) => {
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({ agents: [] })
		}

		const results = await db.select().from(agents)

		// Transform DB results to match API schema
		const agentsData = results.map((agent) => ({
			id: agent.id,
			workspaceId: agent.workspaceId,
			name: agent.name,
			description: agent.description,
			model: agent.model,
			instructions: agent.instructions || '',
			config: agent.config || undefined,
			status: agent.status,
			toolIds: [],
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		}))

		return c.json({ agents: agentsData })
	})
	.openapi(createAgentRoute, async (c) => {
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			const now = new Date().toISOString()
			return c.json(
				{
					id: `agent_${crypto.randomUUID().slice(0, 8)}`,
					workspaceId: 'ws_default',
					name: data.name,
					description: data.description ?? null,
					model: data.model,
					instructions: data.instructions,
					config: data.config,
					status: 'draft' as const,
					toolIds: data.toolIds || [],
					createdAt: now,
					updatedAt: now,
				},
				201,
			)
		}

		// TODO: Get actual user ID from authentication context
		// TODO: Get actual workspace ID from context or request
		const userId = 'user_default'
		const workspaceId = 'ws_default'

		const [agent] = await db
			.insert(agents)
			.values({
				workspaceId,
				name: data.name,
				description: data.description,
				model: data.model,
				instructions: data.instructions,
				config: data.config,
				createdBy: userId,
			})
			.returning()

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
	.openapi(getAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			const now = new Date().toISOString()
			return c.json({
				id,
				workspaceId: 'ws_default',
				name: 'Mock Agent',
				description: 'Mock agent for testing',
				model: 'llama-3.3-70b-instruct',
				instructions: 'You are a helpful assistant.',
				status: 'draft' as const,
				toolIds: [],
				createdAt: now,
				updatedAt: now,
			})
		}

		// TODO: Add authorization check
		const [agent] = await db.select().from(agents).where(eq(agents.id, id))

		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		return c.json({
			id: agent.id,
			workspaceId: agent.workspaceId,
			name: agent.name,
			description: agent.description,
			model: agent.model,
			instructions: agent.instructions || '',
			config: agent.config || undefined,
			status: agent.status,
			toolIds: [],
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		})
	})
	.openapi(updateAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			const now = new Date().toISOString()
			return c.json({
				id,
				workspaceId: 'ws_default',
				name: data.name ?? 'Mock Agent',
				description: data.description ?? null,
				model: data.model ?? 'llama-3.3-70b-instruct',
				instructions: data.instructions ?? 'You are a helpful assistant.',
				config: data.config,
				status: data.status ?? ('draft' as const),
				toolIds: data.toolIds || [],
				createdAt: now,
				updatedAt: now,
			})
		}

		// TODO: Add authorization check
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (data.name !== undefined) updateData.name = data.name
		if (data.description !== undefined) updateData.description = data.description
		if (data.model !== undefined) updateData.model = data.model
		if (data.instructions !== undefined) updateData.instructions = data.instructions
		if (data.config !== undefined) updateData.config = data.config
		if (data.status !== undefined) updateData.status = data.status

		const [agent] = await db
			.update(agents)
			.set(updateData)
			.where(eq(agents.id, id))
			.returning()

		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		return c.json({
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
		})
	})
	.openapi(deleteAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)

		// Return success for development/testing when DB not available
		if (!db) {
			return c.json({ success: true })
		}

		// TODO: Add authorization check
		const result = await db.delete(agents).where(eq(agents.id, id)).returning()

		if (result.length === 0) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		return c.json({ success: true })
	})
	.openapi(deployAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)

		// Return mock data for development/testing when DB not available
		if (!db) {
			return c.json({
				id,
				status: 'deployed' as const,
				deployedAt: new Date().toISOString(),
				version: data.version || '1.0.0',
			})
		}

		// TODO: Add authorization check
		// Update agent status to 'deployed'
		const [agent] = await db
			.update(agents)
			.set({
				status: 'deployed',
				updatedAt: new Date(),
			})
			.where(eq(agents.id, id))
			.returning()

		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		// TODO: Create deployment record in deployments table
		return c.json({
			id,
			status: 'deployed' as const,
			deployedAt: new Date().toISOString(),
			version: data.version || '1.0.0',
		})
	})

export default app
