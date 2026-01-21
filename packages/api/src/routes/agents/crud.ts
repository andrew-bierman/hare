/**
 * Agent CRUD operations (list, get, create, update, delete)
 */

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq, inArray } from 'drizzle-orm'
import { agents, agentTools } from '@hare/db/schema'
import { getDb } from '../../db'
import { commonResponses, requireAdminAccess, requireWriteAccess } from '../../helpers'
import { authMiddleware, workspaceMiddleware } from '../../middleware'
import {
	AgentSchema,
	CreateAgentSchema,
	ErrorSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateAgentSchema,
} from '../../schemas'
import { serializeAgent } from '../../serializers'
import { findAgentByIdAndWorkspace, getAgentToolIds } from './helpers'
import type { WorkspaceEnv } from '@hare/types'

// =============================================================================
// Route Definitions
// =============================================================================

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

// =============================================================================
// App and Route Handlers
// =============================================================================

const baseApp = new OpenAPIHono<WorkspaceEnv>()

baseApp.use('*', authMiddleware)
baseApp.use('*', workspaceMiddleware)

export const crudApp = baseApp
	.openapi(listAgentsRoute, async (c) => {
		const db = getDb(c)
		const workspace = c.get('workspace')

		const results = await db.select().from(agents).where(eq(agents.workspaceId, workspace.id))

		// OPTIMIZATION: Batch fetch all agent-tool relationships in a single query
		const agentIds = results.map((a) => a.id)
		const allAgentTools =
			agentIds.length > 0
				? await db.select().from(agentTools).where(inArray(agentTools.agentId, agentIds))
				: []

		// Group tool IDs by agent ID
		const toolIdsByAgentId = new Map<string, string[]>()
		for (const at of allAgentTools) {
			const existing = toolIdsByAgentId.get(at.agentId) || []
			existing.push(at.toolId)
			toolIdsByAgentId.set(at.agentId, existing)
		}

		const agentsData = results.map((agent) =>
			serializeAgent({ agent, toolIds: toolIdsByAgentId.get(agent.id) || [] }),
		)

		return c.json({ agents: agentsData }, 200)
	})
	.openapi(createAgentRoute, async (c) => {
		const data = c.req.valid('json')
		const db = getDb(c)
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
				systemToolsEnabled: data.systemToolsEnabled ?? true,
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

		return c.json(serializeAgent({ agent, toolIds: data.toolIds || [] }), 201)
	})
	.openapi(getAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)
		const workspace = c.get('workspace')

		const agent = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		const toolIds = await getAgentToolIds({ agentId: agent.id, db })
		return c.json(serializeAgent({ agent, toolIds }), 200)
	})
	.openapi(updateAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const db = getDb(c)
		const workspace = c.get('workspace')
		const role = c.get('workspaceRole')

		requireWriteAccess(role)

		const existing = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!existing) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		const updateData: Partial<typeof agents.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.model !== undefined && { model: data.model }),
			...(data.instructions !== undefined && { instructions: data.instructions }),
			...(data.config !== undefined && { config: data.config }),
			...(data.systemToolsEnabled !== undefined && { systemToolsEnabled: data.systemToolsEnabled }),
			...(data.status !== undefined && { status: data.status }),
		}

		const [agent] = await db.update(agents).set(updateData).where(eq(agents.id, id)).returning()

		if (!agent) {
			return c.json({ error: 'Failed to update agent' }, 500)
		}

		// Update tool attachments if provided (filter out system tools which don't exist in DB)
		if (data.toolIds !== undefined) {
			await db.delete(agentTools).where(eq(agentTools.agentId, id))

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
		return c.json(serializeAgent({ agent, toolIds }), 200)
	})
	.openapi(deleteAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const db = getDb(c)
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
