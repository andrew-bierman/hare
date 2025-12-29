import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { AGENT_LIMITS, AI_MODELS, getModelById } from '@hare/config'
import { agents, agentTools, deployments, tools as toolsTable } from 'web-app/db/schema'
import type { Database } from 'web-app/db/types'
import { routeHttpToAgent } from 'web-app/lib/agents'
import { getCloudflareEnv, getDb } from '../db'
import { commonResponses, requireAdminAccess, requireWriteAccess } from '../helpers'
import { authMiddleware, workspaceMiddleware } from '../middleware'
import {
	AGENT_VALIDATION,
	AgentConfigSchema,
	AgentPreviewInputSchema,
	AgentPreviewResponseSchema,
	AgentSchema,
	ALLOWED_MODEL_IDS,
	CreateAgentSchema,
	DeployAgentSchema,
	DeploymentSchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateAgentSchema,
} from '../schemas'
import type { AllowedModelId } from '../schemas/agents'
import { serializeAgent } from '../serializers'
import {
	deactivateDeployment,
	getDeploymentHistory,
	rollbackDeployment,
} from '../services/deployment'
import type { WorkspaceEnv } from '../types'
import { validateAgentInstructions } from '../utils/sanitize'

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
	description: 'Deploy an agent to production with endpoint URLs',
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

const getDeploymentRoute = createRoute({
	method: 'get',
	path: '/{id}/deployment',
	tags: ['Agents'],
	summary: 'Get deployment info',
	description: 'Get deployment information and endpoints for a deployed agent',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Deployment information',
			content: {
				'application/json': {
					schema: DeploymentSchema,
				},
			},
		},
		400: {
			description: 'Agent not deployed',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent or deployment not found',
			content: {
				'application/json': {
					schema: ErrorSchema,
				},
			},
		},
		...commonResponses,
	},
})

const undeployAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/undeploy',
	tags: ['Agents'],
	summary: 'Undeploy agent',
	description: 'Remove an agent from production',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
	},
	responses: {
		200: {
			description: 'Agent undeployed successfully',
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
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const rollbackAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/rollback',
	tags: ['Agents'],
	summary: 'Rollback agent deployment',
	description: 'Rollback to a previous deployment version',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: z.object({
						version: z.string().optional().describe('Target version to rollback to'),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Rollback successful',
			content: {
				'application/json': {
					schema: z.object({
						success: z.boolean(),
						previousVersion: z.string().optional(),
						currentVersion: z.string().optional(),
						message: z.string(),
					}),
				},
			},
		},
		403: {
			description: 'Admin access required',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const deploymentHistoryRoute = createRoute({
	method: 'get',
	path: '/{id}/deployments',
	tags: ['Agents'],
	summary: 'Get deployment history',
	description: 'Get the deployment history for an agent',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
			limit: z.coerce.number().optional().default(10).describe('Maximum number of results'),
		}),
	},
	responses: {
		200: {
			description: 'Deployment history',
			content: {
				'application/json': {
					schema: z.object({
						deployments: z.array(DeploymentSchema),
					}),
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

const previewAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/preview',
	tags: ['Agents'],
	summary: 'Preview agent configuration',
	description:
		'Validates agent configuration with optional overrides and returns detailed feedback for deployment readiness',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: AgentPreviewInputSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Preview results with validation status',
			content: {
				'application/json': {
					schema: AgentPreviewResponseSchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// Configuration Validation Schemas
// =============================================================================

const ValidationIssueSchema = z.object({
	field: z.string().describe('Field that has the issue'),
	type: z.enum(['error', 'warning']).describe('Issue severity'),
	message: z.string().describe('Issue description'),
})

const ModelPreviewSchema = z.object({
	id: z.string().describe('Model ID'),
	name: z.string().describe('Human-readable model name'),
	provider: z.string().describe('Model provider'),
	contextWindow: z.number().describe('Maximum context window size'),
	maxOutputTokens: z.number().describe('Maximum output tokens'),
	supportsTools: z.boolean().describe('Whether model supports tool calling'),
	estimatedCostPer1KTokens: z.number().describe('Estimated cost per 1K tokens'),
})

const ConfigPreviewSchema = z.object({
	temperature: z.number().describe('Effective temperature'),
	maxTokens: z.number().describe('Effective max tokens'),
	topP: z.number().optional().describe('Effective top-p if set'),
	topK: z.number().optional().describe('Effective top-k if set'),
})

const ValidationResponseSchema = z.object({
	valid: z.boolean().describe('Whether the configuration is valid for deployment'),
	errors: z.array(ValidationIssueSchema).describe('Blocking errors that must be fixed'),
	warnings: z.array(ValidationIssueSchema).describe('Non-blocking warnings'),
	preview: z
		.object({
			name: z.string().describe('Agent name'),
			description: z.string().nullable().describe('Agent description'),
			model: ModelPreviewSchema.describe('Resolved model information'),
			config: ConfigPreviewSchema.describe('Effective configuration with defaults'),
			toolCount: z.number().describe('Number of tools attached'),
			toolsValid: z.boolean().describe('Whether all tools are valid'),
			instructionsLength: z.number().describe('Length of instructions'),
			estimatedTokens: z.number().describe('Estimated instruction token count'),
			readyForDeployment: z.boolean().describe('Whether agent can be deployed'),
		})
		.optional()
		.describe('Preview of the resolved configuration (only if no critical errors)'),
})

const ValidateConfigSchema = z
	.object({
		name: z.string().optional().describe('Agent name'),
		description: z.string().optional().describe('Agent description'),
		model: z.string().optional().describe('Model ID'),
		instructions: z.string().optional().describe('Agent instructions'),
		config: AgentConfigSchema.optional().describe('Model configuration'),
		toolIds: z.array(z.string()).optional().describe('Tool IDs to attach'),
	})
	.openapi('ValidateConfig')

const validateConfigRoute = createRoute({
	method: 'post',
	path: '/validate',
	tags: ['Agents'],
	summary: 'Validate agent configuration',
	description:
		'Validates agent configuration and returns detailed feedback with a preview of the resolved settings',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: ValidateConfigSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Validation results',
			content: {
				'application/json': {
					schema: ValidationResponseSchema,
				},
			},
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
 * Input for finding an agent by ID and workspace.
 */
interface FindAgentByIdAndWorkspaceInput {
	db: Database
	id: string
	workspaceId: string
}

/**
 * Find an agent by ID and workspace, or return null.
 */
async function findAgentByIdAndWorkspace(input: FindAgentByIdAndWorkspaceInput) {
	const { db, id, workspaceId } = input
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

	const agent = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
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

	const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
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

	const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (!existing.instructions) {
		return c.json({ error: 'Agent must have instructions before deployment' }, 400)
	}

	// Generate deployment URL based on request origin
	const requestUrl = new URL(c.req.url)
	const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
	const agentBaseUrl = `${baseUrl}/api/agents/${id}`

	// Configure the Durable Object with agent settings
	const configRequest = new Request(`${agentBaseUrl}/configure`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			agentId: id,
			workspaceId: workspace.id,
			name: existing.name,
			instructions: existing.instructions,
			model: existing.model,
		}),
	})

	try {
		const configResponse = await routeHttpToAgent({
			request: configRequest,
			env,
			agentId: id,
			path: '/configure',
		})

		if (!configResponse.ok) {
			console.error('Failed to configure Durable Object:', await configResponse.text())
		}
	} catch (error) {
		console.error('Error configuring Durable Object:', error)
		// Continue with deployment even if DO config fails - it will be configured on first access
	}

	await db
		.update(agents)
		.set({
			status: 'deployed',
			updatedAt: new Date(),
		})
		.where(eq(agents.id, id))

	const version = data.version || '1.0.0'

	// Generate WebSocket URL (wss for https, ws for http)
	const wsProtocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
	const wsBaseUrl = `${wsProtocol}//${requestUrl.host}`

	const [deployment] = await db
		.insert(deployments)
		.values({
			agentId: id,
			version,
			status: 'active',
			url: agentBaseUrl,
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
			url: agentBaseUrl,
			endpoints: {
				chat: `${agentBaseUrl}/chat`,
				websocket: `${wsBaseUrl}/api/agents/${id}/ws`,
				state: `${agentBaseUrl}/state`,
			},
		},
		200,
	)
})

app.openapi(getDeploymentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	if (existing.status !== 'deployed') {
		return c.json({ error: 'Agent is not deployed' }, 400)
	}

	// Get the latest deployment for this agent
	const [deployment] = await db
		.select()
		.from(deployments)
		.where(eq(deployments.agentId, id))
		.orderBy(deployments.deployedAt)
		.limit(1)

	if (!deployment) {
		return c.json({ error: 'Deployment not found' }, 404)
	}

	// Generate URLs based on request origin
	const requestUrl = new URL(c.req.url)
	const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
	const agentBaseUrl = deployment.url || `${baseUrl}/api/agents/${id}`

	// Generate WebSocket URL (wss for https, ws for http)
	const wsProtocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
	const wsBaseUrl = `${wsProtocol}//${requestUrl.host}`

	return c.json(
		{
			id: deployment.id,
			status: 'deployed' as const,
			deployedAt: deployment.deployedAt.toISOString(),
			version: deployment.version,
			url: agentBaseUrl,
			endpoints: {
				chat: `${agentBaseUrl}/chat`,
				websocket: `${wsBaseUrl}/api/agents/${id}/ws`,
				state: `${agentBaseUrl}/state`,
			},
		},
		200,
	)
})

app.openapi(undeployAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = await getDb(c)
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const result = await deactivateDeployment({ db, agentId: id })
	return c.json(result, 200)
})

app.openapi(rollbackAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = await getDb(c)
	const user = c.get('user')
	const workspace = c.get('workspace')
	const role = c.get('workspaceRole')

	requireAdminAccess(role)

	const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const result = await rollbackDeployment({
		db,
		agentId: id,
		targetVersion: data.version,
		deployedBy: user.id,
	})

	return c.json(result, 200)
})

app.openapi(deploymentHistoryRoute, async (c) => {
	const { id } = c.req.valid('param')
	const { limit } = c.req.valid('query')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
	if (!existing) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	const history = await getDeploymentHistory({ db, agentId: id, limit })

	// Generate URLs based on request origin
	const requestUrl = new URL(c.req.url)
	const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
	const wsProtocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
	const wsBaseUrl = `${wsProtocol}//${requestUrl.host}`

	return c.json(
		{
			deployments: history.map((d) => {
				const agentBaseUrl = d.url || `${baseUrl}/api/agents/${id}`
				return {
					id: d.id,
					status: d.status,
					deployedAt: d.deployedAt.toISOString(),
					version: d.version,
					url: agentBaseUrl,
					endpoints: {
						chat: `${agentBaseUrl}/chat`,
						websocket: `${wsBaseUrl}/api/agents/${id}/ws`,
						state: `${agentBaseUrl}/state`,
					},
				}
			}),
		},
		200,
	)
})

// =============================================================================
// Validation Route Handler
// =============================================================================

app.openapi(validateConfigRoute, async (c) => {
	const data = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	const errors: Array<{ field: string; type: 'error'; message: string }> = []
	const warnings: Array<{ field: string; type: 'warning'; message: string }> = []

	// Validate name
	if (data.name !== undefined) {
		if (data.name.length < AGENT_LIMITS.nameMinLength) {
			errors.push({
				field: 'name',
				type: 'error',
				message: `Name must be at least ${AGENT_LIMITS.nameMinLength} character`,
			})
		}
		if (data.name.length > AGENT_LIMITS.nameMaxLength) {
			errors.push({
				field: 'name',
				type: 'error',
				message: `Name must be at most ${AGENT_LIMITS.nameMaxLength} characters`,
			})
		}
	} else {
		errors.push({
			field: 'name',
			type: 'error',
			message: 'Name is required',
		})
	}

	// Validate description
	if (data.description && data.description.length > AGENT_LIMITS.descriptionMaxLength) {
		warnings.push({
			field: 'description',
			type: 'warning',
			message: `Description exceeds recommended length of ${AGENT_LIMITS.descriptionMaxLength} characters`,
		})
	}

	// Validate model
	let modelInfo = null
	if (data.model) {
		modelInfo = getModelById(data.model)
		if (!modelInfo) {
			errors.push({
				field: 'model',
				type: 'error',
				message: `Unknown model: ${data.model}. Available models: ${AI_MODELS.map((m) => m.id).join(', ')}`,
			})
		} else if (!modelInfo.supportsTools && data.toolIds && data.toolIds.length > 0) {
			warnings.push({
				field: 'model',
				type: 'warning',
				message: `Model ${modelInfo.name} does not support tool calling. Tools will be ignored.`,
			})
		}
	} else {
		errors.push({
			field: 'model',
			type: 'error',
			message: 'Model is required',
		})
	}

	// Validate instructions
	let instructionsLength = 0
	let estimatedTokens = 0
	if (data.instructions !== undefined) {
		instructionsLength = data.instructions.length

		if (instructionsLength === 0) {
			errors.push({
				field: 'instructions',
				type: 'error',
				message: 'Instructions are required for deployment',
			})
		} else if (instructionsLength > AGENT_LIMITS.instructionsMaxLength) {
			errors.push({
				field: 'instructions',
				type: 'error',
				message: `Instructions exceed maximum length of ${AGENT_LIMITS.instructionsMaxLength} characters`,
			})
		}

		// Rough token estimation (approx 4 chars per token)
		estimatedTokens = Math.ceil(instructionsLength / 4)

		// Check context window if model is known
		if (modelInfo && estimatedTokens > modelInfo.contextWindow * 0.5) {
			warnings.push({
				field: 'instructions',
				type: 'warning',
				message: `Instructions may use more than 50% of the model's context window (${modelInfo.contextWindow} tokens)`,
			})
		}

		// Validate instructions content
		const instructionValidation = validateAgentInstructions(data.instructions)
		if (!instructionValidation.valid) {
			for (const issue of instructionValidation.issues) {
				warnings.push({
					field: 'instructions',
					type: 'warning',
					message: issue,
				})
			}
		}
	} else {
		errors.push({
			field: 'instructions',
			type: 'error',
			message: 'Instructions are required',
		})
	}

	// Validate config parameters
	if (data.config) {
		if (data.config.temperature !== undefined) {
			if (data.config.temperature < 0 || data.config.temperature > 2) {
				errors.push({
					field: 'config.temperature',
					type: 'error',
					message: 'Temperature must be between 0 and 2',
				})
			}
			if (data.config.temperature > 1.5) {
				warnings.push({
					field: 'config.temperature',
					type: 'warning',
					message: 'High temperature (>1.5) may produce inconsistent results',
				})
			}
		}

		if (data.config.maxTokens !== undefined) {
			if (modelInfo && data.config.maxTokens > modelInfo.maxOutputTokens) {
				errors.push({
					field: 'config.maxTokens',
					type: 'error',
					message: `Max tokens (${data.config.maxTokens}) exceeds model limit (${modelInfo.maxOutputTokens})`,
				})
			}
		}
	}

	// Validate tools
	let toolsValid = true
	const toolIds = data.toolIds || []

	if (toolIds.length > AGENT_LIMITS.maxToolsPerAgent) {
		errors.push({
			field: 'toolIds',
			type: 'error',
			message: `Too many tools. Maximum is ${AGENT_LIMITS.maxToolsPerAgent}`,
		})
		toolsValid = false
	}

	// Check custom tools exist (system tools start with 'system-')
	const customToolIds = toolIds.filter((id) => !id.startsWith('system-'))
	if (customToolIds.length > 0) {
		const existingTools = await db
			.select({ id: toolsTable.id })
			.from(toolsTable)
			.where(eq(toolsTable.workspaceId, workspace.id))

		const existingToolIds = new Set(existingTools.map((t) => t.id))
		const missingTools = customToolIds.filter((id) => !existingToolIds.has(id))

		if (missingTools.length > 0) {
			errors.push({
				field: 'toolIds',
				type: 'error',
				message: `Unknown tools: ${missingTools.join(', ')}`,
			})
			toolsValid = false
		}
	}

	// Build response
	const hasErrors = errors.length > 0
	const isValid = !hasErrors

	// Preview type for the response
	type ConfigPreview = {
		name: string
		description: string | null
		model: {
			id: string
			name: string
			provider: string
			contextWindow: number
			maxOutputTokens: number
			supportsTools: boolean
			estimatedCostPer1KTokens: number
		}
		config: {
			temperature: number
			maxTokens: number
			topP?: number
			topK?: number
		}
		toolCount: number
		toolsValid: boolean
		instructionsLength: number
		estimatedTokens: number
		readyForDeployment: boolean
	}

	// Build preview only if we have enough valid data
	let preview: ConfigPreview | undefined
	if (data.name && modelInfo) {
		const effectiveConfig = {
			temperature: data.config?.temperature ?? 0.7,
			maxTokens: data.config?.maxTokens ?? 4096,
			...(data.config?.topP !== undefined && { topP: data.config.topP }),
			...(data.config?.topK !== undefined && { topK: data.config.topK }),
		}

		// Estimate cost (per 1K tokens, average of input/output)
		const avgCostPer1M = (modelInfo.inputCostPer1M + modelInfo.outputCostPer1M) / 2
		const estimatedCostPer1KTokens = avgCostPer1M / 1000

		preview = {
			name: data.name,
			description: data.description ?? null,
			model: {
				id: modelInfo.id,
				name: modelInfo.name,
				provider: modelInfo.provider,
				contextWindow: modelInfo.contextWindow,
				maxOutputTokens: modelInfo.maxOutputTokens,
				supportsTools: modelInfo.supportsTools,
				estimatedCostPer1KTokens,
			},
			config: effectiveConfig,
			toolCount: toolIds.length,
			toolsValid,
			instructionsLength,
			estimatedTokens,
			readyForDeployment: isValid && instructionsLength > 0,
		}
	}

	return c.json(
		{
			valid: isValid,
			errors,
			warnings,
			preview,
		},
		200,
	)
})

// =============================================================================
// Preview Route Handler (per-agent validation with overrides)
// =============================================================================

app.openapi(previewAgentRoute, async (c) => {
	const { id } = c.req.valid('param')
	const overrides = c.req.valid('json')
	const db = await getDb(c)
	const workspace = c.get('workspace')

	// Find the agent
	const agent = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
	if (!agent) {
		return c.json({ error: 'Agent not found' }, 404)
	}

	// Merge agent data with overrides
	const effectiveName = overrides.name ?? agent.name
	const effectiveDescription = overrides.description ?? agent.description
	const effectiveModel = overrides.model ?? agent.model
	const effectiveInstructions = overrides.instructions ?? agent.instructions
	const effectiveConfig = {
		...((agent.config as Record<string, unknown>) || {}),
		...(overrides.config || {}),
	}
	const effectiveToolIds = overrides.toolIds ?? (await getAgentToolIds({ agentId: agent.id, db }))

	const errors: Array<{ field: string; type: 'error'; message: string }> = []
	const warnings: Array<{ field: string; type: 'warning'; message: string }> = []

	// Validate name
	if (!effectiveName || effectiveName.length < AGENT_VALIDATION.name.min) {
		errors.push({
			field: 'name',
			type: 'error',
			message: `Name must be at least ${AGENT_VALIDATION.name.min} character`,
		})
	} else if (effectiveName.length > AGENT_VALIDATION.name.max) {
		errors.push({
			field: 'name',
			type: 'error',
			message: `Name must be at most ${AGENT_VALIDATION.name.max} characters`,
		})
	}

	// Validate description
	if (effectiveDescription && effectiveDescription.length > AGENT_VALIDATION.description.max) {
		warnings.push({
			field: 'description',
			type: 'warning',
			message: `Description exceeds recommended length of ${AGENT_VALIDATION.description.max} characters`,
		})
	}

	// Validate model
	let modelInfo = null
	if (effectiveModel) {
		// Check against allowed models
		if (!ALLOWED_MODEL_IDS.includes(effectiveModel as AllowedModelId)) {
			errors.push({
				field: 'model',
				type: 'error',
				message: `Invalid model: "${effectiveModel}". Must be one of: ${ALLOWED_MODEL_IDS.join(', ')}`,
			})
		} else {
			modelInfo = getModelById(effectiveModel)
			if (modelInfo && !modelInfo.supportsTools && effectiveToolIds.length > 0) {
				warnings.push({
					field: 'model',
					type: 'warning',
					message: `Model ${modelInfo.name} does not support tool calling. Tools will be ignored.`,
				})
			}
		}
	} else {
		errors.push({
			field: 'model',
			type: 'error',
			message: 'Model is required',
		})
	}

	// Validate instructions
	let instructionsLength = 0
	let estimatedTokens = 0
	if (effectiveInstructions) {
		instructionsLength = effectiveInstructions.length

		if (instructionsLength === 0) {
			errors.push({
				field: 'instructions',
				type: 'error',
				message: 'Instructions are required for deployment',
			})
		} else if (instructionsLength > AGENT_VALIDATION.instructions.max) {
			errors.push({
				field: 'instructions',
				type: 'error',
				message: `Instructions exceed maximum length of ${AGENT_VALIDATION.instructions.max} characters`,
			})
		}

		// Rough token estimation (approx 4 chars per token)
		estimatedTokens = Math.ceil(instructionsLength / 4)

		// Check context window if model is known
		if (modelInfo && estimatedTokens > modelInfo.contextWindow * 0.5) {
			warnings.push({
				field: 'instructions',
				type: 'warning',
				message: `Instructions may use more than 50% of the model's context window (${modelInfo.contextWindow} tokens)`,
			})
		}

		// Validate instructions content
		const instructionValidation = validateAgentInstructions(effectiveInstructions)
		if (!instructionValidation.valid) {
			for (const issue of instructionValidation.issues) {
				warnings.push({
					field: 'instructions',
					type: 'warning',
					message: issue,
				})
			}
		}
	} else {
		errors.push({
			field: 'instructions',
			type: 'error',
			message: 'Instructions are required',
		})
	}

	// Validate config parameters
	const temperature =
		typeof effectiveConfig.temperature === 'number' ? effectiveConfig.temperature : undefined
	const maxTokens =
		typeof effectiveConfig.maxTokens === 'number' ? effectiveConfig.maxTokens : undefined
	const topP = typeof effectiveConfig.topP === 'number' ? effectiveConfig.topP : undefined
	const topK = typeof effectiveConfig.topK === 'number' ? effectiveConfig.topK : undefined

	if (temperature !== undefined) {
		if (
			temperature < AGENT_VALIDATION.config.temperature.min ||
			temperature > AGENT_VALIDATION.config.temperature.max
		) {
			errors.push({
				field: 'config.temperature',
				type: 'error',
				message: `Temperature must be between ${AGENT_VALIDATION.config.temperature.min} and ${AGENT_VALIDATION.config.temperature.max}`,
			})
		}
		if (temperature > 1.5) {
			warnings.push({
				field: 'config.temperature',
				type: 'warning',
				message: 'High temperature (>1.5) may produce inconsistent results',
			})
		}
	}

	if (maxTokens !== undefined) {
		if (!Number.isInteger(maxTokens) || maxTokens < AGENT_VALIDATION.config.maxTokens.min) {
			errors.push({
				field: 'config.maxTokens',
				type: 'error',
				message: `Max tokens must be a positive integer (min ${AGENT_VALIDATION.config.maxTokens.min})`,
			})
		} else if (maxTokens > AGENT_VALIDATION.config.maxTokens.max) {
			errors.push({
				field: 'config.maxTokens',
				type: 'error',
				message: `Max tokens must be at most ${AGENT_VALIDATION.config.maxTokens.max}`,
			})
		} else if (modelInfo && maxTokens > modelInfo.maxOutputTokens) {
			errors.push({
				field: 'config.maxTokens',
				type: 'error',
				message: `Max tokens (${maxTokens}) exceeds model limit (${modelInfo.maxOutputTokens})`,
			})
		}
	}

	// Validate tools
	let toolsValid = true

	if (effectiveToolIds.length > AGENT_VALIDATION.maxToolsPerAgent) {
		errors.push({
			field: 'toolIds',
			type: 'error',
			message: `Too many tools. Maximum is ${AGENT_VALIDATION.maxToolsPerAgent}`,
		})
		toolsValid = false
	}

	// Check custom tools exist (system tools start with 'system-')
	const customToolIds = effectiveToolIds.filter((id) => !id.startsWith('system-'))
	if (customToolIds.length > 0) {
		const existingTools = await db
			.select({ id: toolsTable.id })
			.from(toolsTable)
			.where(eq(toolsTable.workspaceId, workspace.id))

		const existingToolIds = new Set(existingTools.map((t) => t.id))
		const missingTools = customToolIds.filter((id) => !existingToolIds.has(id))

		if (missingTools.length > 0) {
			errors.push({
				field: 'toolIds',
				type: 'error',
				message: `Unknown tools: ${missingTools.join(', ')}`,
			})
			toolsValid = false
		}
	}

	// Build response
	const hasErrors = errors.length > 0
	const isValid = !hasErrors

	// Build preview
	type AgentPreview = {
		name: string
		description: string | null
		model: {
			id: string
			name: string
			provider: string
			contextWindow: number
			maxOutputTokens: number
			supportsTools: boolean
			estimatedCostPer1KTokens: number
		}
		config: {
			temperature: number
			maxTokens: number
			topP?: number
			topK?: number
		}
		toolCount: number
		toolsValid: boolean
		instructionsLength: number
		estimatedTokens: number
		readyForDeployment: boolean
	}

	let preview: AgentPreview | undefined
	if (effectiveName && modelInfo) {
		const resolvedConfig = {
			temperature: temperature ?? 0.7,
			maxTokens: maxTokens ?? 4096,
			...(topP !== undefined && { topP }),
			...(topK !== undefined && { topK }),
		}

		// Estimate cost (per 1K tokens, average of input/output)
		const avgCostPer1M = (modelInfo.inputCostPer1M + modelInfo.outputCostPer1M) / 2
		const estimatedCostPer1KTokens = avgCostPer1M / 1000

		preview = {
			name: effectiveName,
			description: effectiveDescription ?? null,
			model: {
				id: modelInfo.id,
				name: modelInfo.name,
				provider: modelInfo.provider,
				contextWindow: modelInfo.contextWindow,
				maxOutputTokens: modelInfo.maxOutputTokens,
				supportsTools: modelInfo.supportsTools,
				estimatedCostPer1KTokens,
			},
			config: resolvedConfig,
			toolCount: effectiveToolIds.length,
			toolsValid,
			instructionsLength,
			estimatedTokens,
			readyForDeployment: isValid && instructionsLength > 0,
		}
	}

	return c.json(
		{
			valid: isValid,
			errors,
			warnings,
			preview,
		},
		200,
	)
})

export default app
