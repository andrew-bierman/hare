/**
 * oRPC Agents Router
 *
 * Handles all agent-related operations with full type safety.
 */

import { z } from 'zod'
import { and, count, desc, eq, gte, inArray, max, sql } from 'drizzle-orm'
import { agents, agentTools, agentVersions, deployments, usage } from '@hare/db/schema'
import { config } from '@hare/config'
import { requireWrite, requireAdmin, notFound, badRequest, serverError, type WorkspaceContext } from '../base'
import { logAudit } from '../audit'
import {
	AgentSchema,
	AgentVersionSchema,
	AgentVersionsQuerySchema,
	AgentVersionsResponseSchema,
	CloneAgentResponseSchema,
	CreateAgentSchema,
	UpdateAgentSchema,
	DeploymentSchema,
	SuccessSchema,
	IdParamSchema,
	AgentPreviewInputSchema,
	AgentPreviewResponseSchema,
	ValidationIssueSchema,
	RollbackAgentSchema,
	RollbackResponseSchema,
	AgentHealthMetricsSchema,
	type HealthStatus,
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

/**
 * Derives health status from success rate.
 * - healthy: >95% success rate
 * - degraded: 80-95% success rate
 * - unhealthy: <80% success rate
 */
function deriveHealthStatus(successRate: number): HealthStatus {
	if (successRate > 95) return 'healthy'
	if (successRate >= 80) return 'degraded'
	return 'unhealthy'
}

/**
 * Calculates agent health metrics from usage data over the last 24 hours.
 */
async function getAgentHealthMetrics(options: {
	agentId: string
	agentName: string
	db: WorkspaceContext['db']
}): Promise<z.infer<typeof AgentHealthMetricsSchema>> {
	const { agentId, agentName, db } = options

	// Calculate time window (last 24 hours)
	const endDate = new Date()
	const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)

	// Query usage metrics for the agent in the last 24 hours
	const [metrics] = await db
		.select({
			totalRequests: sql<number>`COUNT(*)`,
			errorCount: sql<number>`SUM(CASE WHEN json_extract(${usage.metadata}, '$.statusCode') >= 400 OR json_extract(${usage.metadata}, '$.statusCode') IS NULL THEN 0 ELSE CASE WHEN json_extract(${usage.metadata}, '$.statusCode') < 200 OR json_extract(${usage.metadata}, '$.statusCode') >= 300 THEN 1 ELSE 0 END END)`,
			averageLatency: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
		})
		.from(usage)
		.where(and(eq(usage.agentId, agentId), gte(usage.createdAt, startDate)))

	const totalRequests = metrics?.totalRequests ?? 0
	const errorCount = metrics?.errorCount ?? 0
	const averageLatencyMs = metrics?.averageLatency ?? 0

	// Calculate success rate (handle division by zero)
	const successRate = totalRequests > 0 ? ((totalRequests - errorCount) / totalRequests) * 100 : 100

	return {
		agentId,
		agentName,
		status: deriveHealthStatus(successRate),
		metrics: {
			successRate: Math.round(successRate * 100) / 100,
			averageLatencyMs: Math.round(averageLatencyMs),
			errorCount,
			totalRequests,
		},
		period: {
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		},
	}
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

		// Batch fetch all agent-tool relationships in a single query
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
			serializeAgent(agent, toolIdsByAgentId.get(agent.id) || []),
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

		// Log audit event for agent creation
		await logAudit({
			context,
			action: config.enums.auditAction.AGENT_CREATE,
			resourceType: 'agent',
			resourceId: agent.id,
			details: {
				name: agent.name,
				model: agent.model,
				toolIds: input.toolIds ?? [],
			},
		})

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

		// Log audit event for agent update
		await logAudit({
			context,
			action: config.enums.auditAction.AGENT_UPDATE,
			resourceType: 'agent',
			resourceId: id,
			details: {
				updatedFields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined),
				name: agent.name,
			},
		})

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

		// Log audit event for agent deletion
		const deletedAgent = result[0]
		await logAudit({
			context,
			action: config.enums.auditAction.AGENT_DELETE,
			resourceType: 'agent',
			resourceId: input.id,
			details: {
				name: deletedAgent?.name,
			},
		})

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
				metadata: agent.config ? { config: agent.config } : null,
			})
			.returning()

		if (!deployment) serverError('Failed to create deployment')

		const baseUrl = `/api/agents/${input.id}`

		// Log audit event for agent deployment
		await logAudit({
			context,
			action: config.enums.auditAction.AGENT_DEPLOY,
			resourceType: 'agent',
			resourceId: input.id,
			details: {
				name: agent.name,
				version,
				deploymentId: deployment.id,
				model: agent.model,
			},
		})

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
			.orderBy(desc(deployments.deployedAt))
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
			.orderBy(desc(deployments.deployedAt))
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
 * Rollback agent to a previous version
 */
export const rollback = requireAdmin
	.route({ method: 'POST', path: '/agents/{id}/rollback' })
	.input(IdParamSchema.merge(RollbackAgentSchema))
	.output(RollbackResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context
		const { id, version: targetVersion } = input

		// Find the agent
		const agent = await findAgent(id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		// Find the target version to restore
		const [targetVersionRecord] = await db
			.select()
			.from(agentVersions)
			.where(and(eq(agentVersions.agentId, id), eq(agentVersions.version, targetVersion)))

		if (!targetVersionRecord) {
			notFound(`Version ${targetVersion} not found for this agent`)
		}

		// Get the current max version number
		const [maxVersionResult] = await db
			.select({ maxVersion: max(agentVersions.version) })
			.from(agentVersions)
			.where(eq(agentVersions.agentId, id))

		const previousVersion = maxVersionResult?.maxVersion ?? 0
		const newVersionNumber = previousVersion + 1

		// Restore agent config from the target version
		await db
			.update(agents)
			.set({
				instructions: targetVersionRecord.instructions,
				model: targetVersionRecord.model,
				config: targetVersionRecord.config,
				updatedAt: new Date(),
			})
			.where(eq(agents.id, id))

		// Update agent tools to match the target version
		await db.delete(agentTools).where(eq(agentTools.agentId, id))
		const restoredToolIds = targetVersionRecord.toolIds ?? []
		if (restoredToolIds.length > 0) {
			const customToolIds = restoredToolIds.filter((toolId) => !toolId.startsWith('system-'))
			if (customToolIds.length > 0) {
				await db.insert(agentTools).values(
					customToolIds.map((toolId) => ({
						agentId: id,
						toolId,
					})),
				)
			}
		}

		// Create a new version record for this rollback (non-destructive)
		const [newAgentVersion] = await db
			.insert(agentVersions)
			.values({
				agentId: id,
				version: newVersionNumber,
				instructions: targetVersionRecord.instructions,
				model: targetVersionRecord.model,
				config: targetVersionRecord.config,
				toolIds: restoredToolIds,
				createdBy: user.id,
			})
			.returning()

		if (!newAgentVersion) serverError('Failed to create rollback version')

		// Check if agent was deployed and redeploy if so
		let deploymentInfo: z.infer<typeof DeploymentSchema> | undefined
		if (agent.status === config.enums.agentStatus.DEPLOYED) {
			// Mark current deployment as inactive
			await db
				.update(deployments)
				.set({ status: config.enums.deploymentStatus.INACTIVE })
				.where(eq(deployments.agentId, id))

			// Create new deployment with restored config
			const version = `${newVersionNumber}.0.0`
			const [deployment] = await db
				.insert(deployments)
				.values({
					agentId: id,
					version,
					status: config.enums.deploymentStatus.ACTIVE,
					url: `/api/agents/${id}`,
					deployedBy: user.id,
					metadata: targetVersionRecord.config ? { config: targetVersionRecord.config } : null,
				})
				.returning()

			if (deployment) {
				const baseUrl = `/api/agents/${id}`
				deploymentInfo = {
					id: deployment.id,
					status: config.enums.deploymentStatus.ACTIVE,
					deployedAt: deployment.deployedAt.toISOString(),
					version,
					url: baseUrl,
					endpoints: {
						chat: `${baseUrl}/chat`,
						websocket: `/api/agents/${id}/ws`,
						state: `${baseUrl}/state`,
					},
				}
			}
		}

		return {
			success: true,
			previousVersion,
			restoredVersion: targetVersion,
			newVersion: newVersionNumber,
			deployment: deploymentInfo,
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

/**
 * Get agent health metrics
 *
 * Calculates health metrics from usage data over the last 24 hours:
 * - Success rate (percentage of 2xx responses)
 * - Average latency in milliseconds
 * - Error count (non-2xx responses)
 * - Total requests
 *
 * Health status is derived from success rate:
 * - healthy: >95%
 * - degraded: 80-95%
 * - unhealthy: <80%
 */
export const getHealth = requireWrite
	.route({ method: 'GET', path: '/agents/{id}/health' })
	.input(IdParamSchema)
	.output(AgentHealthMetricsSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const agent = await findAgent(input.id, workspaceId, db)
		if (!agent) notFound('Agent not found')

		return getAgentHealthMetrics({
			agentId: agent.id,
			agentName: agent.name,
			db,
		})
	})

/**
 * Clone an agent
 *
 * Creates a duplicate of an existing agent with all its properties:
 * - Name with ' (Copy)' suffix
 * - Description, instructions, model, config
 * - Tool attachments
 * - New agent starts in draft status
 */
export const clone = requireWrite
	.route({ method: 'POST', path: '/agents/{id}/clone', successStatus: 201 })
	.input(IdParamSchema)
	.output(CloneAgentResponseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Find the source agent
		const sourceAgent = await findAgent(input.id, workspaceId, db)
		if (!sourceAgent) notFound('Agent not found')

		// Get the source agent's tool IDs
		const sourceToolIds = await getAgentToolIds(input.id, db)

		// Create the cloned agent with ' (Copy)' suffix and draft status
		const [clonedAgent] = await db
			.insert(agents)
			.values({
				workspaceId,
				name: `${sourceAgent.name} (Copy)`,
				description: sourceAgent.description,
				model: sourceAgent.model,
				instructions: sourceAgent.instructions,
				config: sourceAgent.config,
				systemToolsEnabled: sourceAgent.systemToolsEnabled,
				status: config.enums.agentStatus.DRAFT,
				createdBy: user.id,
			})
			.returning()

		if (!clonedAgent) serverError('Failed to clone agent')

		// Copy tool attachments to new agent (filter out system tools)
		if (sourceToolIds.length > 0) {
			const customToolIds = sourceToolIds.filter((id) => !id.startsWith('system-'))
			if (customToolIds.length > 0) {
				await db.insert(agentTools).values(
					customToolIds.map((toolId) => ({
						agentId: clonedAgent.id,
						toolId,
					})),
				)
			}
		}

		// Log audit event for agent clone
		await logAudit({
			context,
			action: config.enums.auditAction.AGENT_CLONE,
			resourceType: 'agent',
			resourceId: clonedAgent.id,
			details: {
				sourceAgentId: input.id,
				sourceAgentName: sourceAgent.name,
				clonedAgentName: clonedAgent.name,
				toolIds: sourceToolIds,
			},
		})

		return {
			id: clonedAgent.id,
			redirectUrl: `/dashboard/agents/${clonedAgent.id}`,
		}
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
	rollback,
	preview,
	getHealth,
	clone,
}
