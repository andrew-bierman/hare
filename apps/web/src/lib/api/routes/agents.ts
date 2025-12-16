import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
	AgentSchema,
	CreateAgentSchema,
	DeployAgentSchema,
	DeploymentSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateAgentSchema,
} from '../schemas'

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
		// TODO: Get from DB filtered by workspace (from header or query)
		return c.json({
			agents: [
				{
					id: 'agent_xxx',
					workspaceId: 'ws_default',
					name: 'Customer Support Agent',
					description: 'Handles customer inquiries',
					model: 'llama-3.3-70b-instruct',
					instructions: 'You are a helpful customer support agent. Be polite and professional.',
					status: 'deployed' as const,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		})
	})
	.openapi(createAgentRoute, async (c) => {
		const data = c.req.valid('json')
		const now = new Date().toISOString()
		// TODO: Insert to DB
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
				toolIds: data.toolIds,
				createdAt: now,
				updatedAt: now,
			},
			201,
		)
	})
	.openapi(getAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		// TODO: Get from DB with authorization check
		return c.json({
			id,
			workspaceId: 'ws_default',
			name: 'Customer Support Agent',
			description: 'Handles customer inquiries',
			model: 'llama-3.3-70b-instruct',
			instructions: 'You are a helpful customer support agent. Be polite and professional.',
			config: {
				temperature: 0.7,
				maxTokens: 4096,
				memory: {
					enabled: true,
					maxMessages: 20,
					retentionDays: 30,
				},
			},
			status: 'deployed' as const,
			toolIds: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	})
	.openapi(updateAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		// TODO: Update in DB with authorization check
		return c.json({
			id,
			workspaceId: 'ws_default',
			name: data.name ?? 'Customer Support Agent',
			description: data.description ?? null,
			model: data.model ?? 'llama-3.3-70b-instruct',
			instructions: data.instructions ?? 'You are a helpful assistant.',
			config: data.config,
			status: 'draft' as const,
			toolIds: data.toolIds,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		})
	})
	.openapi(deleteAgentRoute, async (c) => {
		const { id: _id } = c.req.valid('param')
		// TODO: Delete from DB with authorization check
		return c.json({ success: true })
	})
	.openapi(deployAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		// TODO: Update agent status to 'deployed' in DB
		// TODO: Create deployment record
		return c.json({
			id,
			status: 'deployed' as const,
			deployedAt: new Date().toISOString(),
			version: data.version || '1.0.0',
		})
	})

export default app
