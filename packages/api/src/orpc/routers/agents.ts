/**
 * oRPC Agents Router
 *
 * Handles all agent-related operations with full type safety.
 */

import { z } from 'zod'
import { and, count, desc, eq, inArray, max } from 'drizzle-orm'
import { agents, agentTools, agentVersions, deployments } from '@hare/db/schema'
import { config } from '@hare/config'
import { requireWrite, requireAdmin, notFound, badRequest, serverError, type WorkspaceContext } from '../base'
import {
	AgentSchema,
	AgentVersionSchema,
	AgentVersionsQuerySchema,
	AgentVersionsResponseSchema,
	CreateAgentSchema,
	UpdateAgentSchema,
	DeploymentSchema,
	SuccessSchema,
	IdParamSchema,
	AgentPreviewInputSchema,
	AgentPreviewResponseSchema,
	ValidationIssueSchema,
} from '../../schemas'

// =============================================================================
// Helpers
// =============================================================================

async function getAgentToolIds(agentId: string, db: WorkspaceContext['db']): Promise<string[]> {
	const rows = await db
		.select({ toolId: agentTools.toolId })
		.from(agentTools)
		.where(eq(agentTools.agentId, agentId))
	return rows.map((r) => r.toolId)
}

/**
 * SQLite max parameters limit (SQLITE_MAX_VARIABLE_NUMBER).
 * D1/SQLite can't handle more than 999 parameters in a single query.
 */
const SQLITE_MAX_PARAMS = 999

/**
 * Batch fetch tool IDs for multiple agents (prevents N+1 queries)
 * Returns a Map of agentId -> toolIds[]
 * Handles SQLite's 999 parameter limit by chunking if needed.
 */
async function getAgentToolIdsMap(
	agentIds: string[],
	db: WorkspaceContext['db'],
): Promise<Map<string, string[]>> {
	if (agentIds.length === 0) return new Map()

	const toolsMap = new Map<string, string[]>()
	for (const agentId of agentIds) {
		toolsMap.set(agentId, [])
	}

	// Chunk to avoid SQLite's 999 parameter limit
	for (let i = 0; i < agentIds.length; i += SQLITE_MAX_PARAMS) {
		const chunk = agentIds.slice(i, i + SQLITE_MAX_PARAMS)
		const rows = await db
			.select({ agentId: agentTools.agentId, toolId: agentTools.toolId })
			.from(agentTools)
			.where(inArray(agentTools.agentId, chunk))

		for (const row of rows) {
			const existing = toolsMap.get(row.agentId) || []
			existing.push(row.toolId)
			toolsMap.set(row.agentId, existing)
		}
	}

	return toolsMap
}

function serializeAgent(
	agent: typeof agents.$inferSelect,
	toolIds: string[],
): z.infer<typeof AgentSchema> {
	return {
		id: agent.id,
		workspaceId: agent.workspaceId,
		name: agent.name,
		description: agent.description,
		model: agent.model,
		instructions: agent.instructions,
		config: agent.config as z.infer<typeof AgentSchema>['config'],
		status: agent.status as z.infer<typeof AgentSchema>['status'],
		systemToolsEnabled: agent.systemToolsEnabled,
		toolIds,
		createdAt: agent.createdAt.toISOString(),
		updatedAt: agent.updatedAt.toISOString(),
	}
}

async function findAgent(id: string, workspaceId: string, db: WorkspaceContext['db']) {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List all agents in workspace
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/agents' })
	.output(z.object({ agents: z.array(AgentSchema) }))
	.handler(async ({ context }) => {
		const { db, workspaceId } = context

		const results = await db.select().from(agents).where(eq(agents.workspaceId, workspaceId))

		// Batch fetch all tool IDs in a single query (prevents N+1)
		const toolsMap = await getAgentToolIdsMap(
			results.map((a) => a.id),
			db,
		)

		const agentsData = results.map((agent) =>
			serializeAgent(agent, toolsMap.get(agent.id) || []),
		)

		return { agents: agentsData }
	})

/**
 * Get single agent by ID
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/agents/{id}' })
	.input(IdParamSchema)
	.output(AgentSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const agent = await findAgent(input.id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		const toolIds = await getAgentToolIds(agent.id, db)
		return serializeAgent(agent, toolIds)
	})

/**
 * Create new agent
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/agents', successStatus: 201 })
	.input(CreateAgentSchema)
	.output(AgentSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		const [agent] = await db
			.insert(agents)
			.values({
				workspaceId,
				name: input.name,
				description: input.description,
				model: input.model,
				instructions: input.instructions,
				config: input.config,
				systemToolsEnabled: input.systemToolsEnabled ?? true,
				createdBy: user.id,
			})
			.returning()

		if (!agent) serverError('Failed to create agent')

		// Attach tools if provided (filter out system tools)
		if (input.toolIds && input.toolIds.length > 0) {
			const customToolIds = input.toolIds.filter((id) => !id.startsWith('system-'))
			if (customToolIds.length > 0) {
				await db.insert(agentTools).values(
					customToolIds.map((toolId) => ({
						agentId: agent.id,
						toolId,
					})),
				)
			}
		}

		return serializeAgent(agent, input.toolIds || [])
	})

/**
 * Update agent
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/agents/{id}' })
	.input(IdParamSchema.merge(UpdateAgentSchema))
	.output(AgentSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const existing = await findAgent(id, workspaceId, db)
		if (!existing) notFound('Agent not found')

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

		if (!agent) serverError('Failed to update agent')

		// Update tool attachments if provided
		if (data.toolIds !== undefined) {
			await db.delete(agentTools).where(eq(agentTools.agentId, id))

			const customToolIds = data.toolIds.filter((toolId) => !toolId.startsWith('system-'))
			if (customToolIds.length > 0) {
				await db.insert(agentTools).values(
					customToolIds.map((toolId) => ({
						agentId: id,
						toolId,
					})),
				)
			}
		}

		const toolIds = await getAgentToolIds(id, db)
		return serializeAgent(agent, toolIds)
	})

/**
 * Delete agent
 */
export const remove = requireAdmin
	.route({ method: 'DELETE', path: '/agents/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(agents)
			.where(and(eq(agents.id, input.id), eq(agents.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('Agent not found')

		return { success: true }
	})

/**
 * Deploy agent
 */
export const deploy = requireAdmin
	.route({ method: 'POST', path: '/agents/{id}/deploy' })
	.input(IdParamSchema.extend({ version: z.string().optional() }))
	.output(DeploymentSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		const agent = await findAgent(input.id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		if (!agent.instructions) {
			badRequest('Agent must have instructions before deployment')
		}

		// Get attached tool IDs for the version snapshot
		const toolIds = await getAgentToolIds(input.id, db)

		// Get the max existing version number for this agent
		const [maxVersionResult] = await db
			.select({ maxVersion: max(agentVersions.version) })
			.from(agentVersions)
			.where(eq(agentVersions.agentId, input.id))

		const nextVersion = (maxVersionResult?.maxVersion ?? 0) + 1

		// Create agent version record before deployment
		const [agentVersion] = await db
			.insert(agentVersions)
			.values({
				agentId: input.id,
				version: nextVersion,
				instructions: agent.instructions,
				model: agent.model,
				config: agent.config,
				toolIds,
				createdBy: user.id,
			})
			.returning()

		if (!agentVersion) serverError('Failed to create agent version')

		// Update agent status
		await db
			.update(agents)
			.set({ status: config.enums.agentStatus.DEPLOYED, updatedAt: new Date() })
			.where(eq(agents.id, input.id))

		const version = input.version || `${nextVersion}.0.0`

		// Create deployment record
		const [deployment] = await db
			.insert(deployments)
			.values({
				agentId: input.id,
				version,
				status: config.enums.deploymentStatus.ACTIVE,
				url: `/api/agents/${input.id}`,
				deployedBy: user.id,
				metadata: agent.config ? { config: agent.config } : undefined,
			})
			.returning()

		if (!deployment) serverError('Failed to create deployment')

		const baseUrl = `/api/agents/${input.id}`

		return {
			id: deployment.id,
			status: config.enums.deploymentStatus.ACTIVE,
			deployedAt: deployment.deployedAt.toISOString(),
			version,
			url: baseUrl,
			endpoints: {
				chat: `${baseUrl}/chat`,
				websocket: `/api/agents/${input.id}/ws`,
				state: `${baseUrl}/state`,
			},
		}
	})

/**
 * Undeploy agent
 */
export const undeploy = requireAdmin
	.route({ method: 'POST', path: '/agents/{id}/undeploy' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const agent = await findAgent(input.id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		await db
			.update(agents)
			.set({ status: config.enums.agentStatus.DRAFT, updatedAt: new Date() })
			.where(eq(agents.id, input.id))

		await db.update(deployments).set({ status: config.enums.deploymentStatus.INACTIVE }).where(eq(deployments.agentId, input.id))

		return { success: true }
	})

/**
 * Get deployment info
 */
export const getDeployment = requireWrite
	.route({ method: 'GET', path: '/agents/{id}/deployment' })
	.input(IdParamSchema)
	.output(DeploymentSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const agent = await findAgent(input.id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		if (agent.status !== config.enums.agentStatus.DEPLOYED) {
			badRequest('Agent is not deployed')
		}

		const [deployment] = await db
			.select()
			.from(deployments)
			.where(eq(deployments.agentId, input.id))
			.orderBy(deployments.deployedAt)
			.limit(1)

		if (!deployment) notFound('Deployment not found')

		const baseUrl = deployment.url || `/api/agents/${input.id}`

		return {
			id: deployment.id,
			status: deployment.status as z.infer<typeof DeploymentSchema>['status'],
			deployedAt: deployment.deployedAt.toISOString(),
			version: deployment.version,
			url: baseUrl,
			endpoints: {
				chat: `${baseUrl}/chat`,
				websocket: `/api/agents/${input.id}/ws`,
				state: `${baseUrl}/state`,
			},
		}
	})

/**
 * Get deployment history
 */
export const getDeploymentHistory = requireWrite
	.route({ method: 'GET', path: '/agents/{id}/deployments' })
	.input(IdParamSchema.extend({ limit: z.coerce.number().optional().default(10) }))
	.output(z.object({ deployments: z.array(DeploymentSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const agent = await findAgent(input.id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		const history = await db
			.select()
			.from(deployments)
			.where(eq(deployments.agentId, input.id))
			.orderBy(deployments.deployedAt)
			.limit(input.limit)

		return {
			deployments: history.map((d) => {
				const baseUrl = d.url || `/api/agents/${input.id}`
				return {
					id: d.id,
					status: d.status as z.infer<typeof DeploymentSchema>['status'],
					deployedAt: d.deployedAt.toISOString(),
					version: d.version,
					url: baseUrl,
					endpoints: {
						chat: `${baseUrl}/chat`,
						websocket: `/api/agents/${input.id}/ws`,
						state: `${baseUrl}/state`,
					},
				}
			}),
		}
	})

/**
 * Get agent version history
 */
export const getVersions = requireWrite
	.route({ method: 'GET', path: '/agents/{id}/versions' })
	.input(IdParamSchema.merge(AgentVersionsQuerySchema))
	.output(AgentVersionsResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const { id, limit, offset } = input

		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		// Get total count
		const [countResult] = await db
			.select({ total: count() })
			.from(agentVersions)
			.where(eq(agentVersions.agentId, id))

		const total = countResult?.total ?? 0

		// Get versions sorted by version number descending
		const versions = await db
			.select()
			.from(agentVersions)
			.where(eq(agentVersions.agentId, id))
			.orderBy(desc(agentVersions.version))
			.limit(limit)
			.offset(offset)

		return {
			versions: versions.map((v) => ({
				id: v.id,
				agentId: v.agentId,
				version: v.version,
				instructions: v.instructions,
				model: v.model,
				config: v.config as z.infer<typeof AgentVersionSchema>['config'],
				toolIds: v.toolIds,
				createdAt: v.createdAt.toISOString(),
				createdBy: v.createdBy,
			})),
			total,
			limit,
			offset,
		}
	})

/**
 * Preview/validate agent configuration
 */
export const preview = requireWrite
	.route({ method: 'POST', path: '/agents/preview' })
	.input(AgentPreviewInputSchema)
	.output(AgentPreviewResponseSchema)
	.handler(async ({ input }) => {
		const errors: z.infer<typeof ValidationIssueSchema>[] = []
		const warnings: z.infer<typeof ValidationIssueSchema>[] = []

		// Use input fields directly (no nested overrides in the strong schema)
		const name = input.name ?? ''
		const instructions = input.instructions ?? ''
		const model = input.model ?? ''

		// Validate name
		if (!name || name.trim().length === 0) {
			errors.push({ field: 'name', message: 'Agent name is required', type: 'error' })
		}

		// Validate instructions
		if (!instructions || instructions.trim().length === 0) {
			warnings.push({
				field: 'instructions',
				message: 'Agent should have instructions for best results',
				type: 'warning',
			})
		}

		// Validate model
		if (!model) {
			errors.push({ field: 'model', message: 'Model is required', type: 'error' })
		}

		const valid = errors.length === 0

		return { valid, errors, warnings }
	})

// =============================================================================
// Router Export
// =============================================================================

export const agentsRouter = {
	list,
	get,
	create,
	update,
	delete: remove,
	deploy,
	undeploy,
	getDeployment,
	getDeploymentHistory,
	getVersions,
	preview,
}
