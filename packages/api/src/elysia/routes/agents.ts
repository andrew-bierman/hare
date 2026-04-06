/**
 * Agent Routes
 *
 * CRUD, deployment, versioning, and health for agents.
 */

import { config, isSystemToolId } from '@hare/config'
import type { Database } from '@hare/db'
import { agents, agentTools, agentVersions, deployments, usage } from '@hare/db/schema'
import { and, count, desc, eq, gte, inArray, max, sql } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import {
	type AgentHealthMetricsSchema,
	AgentPreviewInputSchema,
	type AgentSchema,
	type AgentVersionSchema,
	CreateAgentSchema,
	type DeploymentSchema,
	type HealthStatus,
	RollbackAgentSchema,
	UpdateAgentSchema,
	type ValidationIssueSchema,
} from '../../schemas'
import { logAudit } from '../audit'
import { type AuthUserContext, adminPlugin, writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

async function getAgentToolIds(agentId: string, db: Database): Promise<string[]> {
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

async function findAgent(options: { id: string; workspaceId: string; db: Database }) {
	const { id, workspaceId, db } = options
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)))
	return agent || null
}

function deriveHealthStatus(successRate: number): HealthStatus {
	if (successRate > 95) return 'healthy'
	if (successRate >= 80) return 'degraded'
	return 'unhealthy'
}

async function getAgentHealthMetrics(options: {
	agentId: string
	agentName: string
	db: Database
}): Promise<z.infer<typeof AgentHealthMetricsSchema>> {
	const { agentId, agentName, db } = options
	const endDate = new Date()
	const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)

	const [metrics] = await db
		.select({
			totalRequests: sql<number>`COUNT(*)`,
			errorCount: sql<number>`SUM(CASE WHEN json_extract(${usage.metadata}, '$.statusCode') IS NULL OR json_extract(${usage.metadata}, '$.statusCode') < 200 OR json_extract(${usage.metadata}, '$.statusCode') >= 300 THEN 1 ELSE 0 END)`,
			averageLatency: sql<number>`COALESCE(AVG(json_extract(${usage.metadata}, '$.duration')), 0)`,
		})
		.from(usage)
		.where(and(eq(usage.agentId, agentId), gte(usage.createdAt, startDate)))

	const totalRequests = metrics?.totalRequests ?? 0
	const errorCount = metrics?.errorCount ?? 0
	const averageLatencyMs = metrics?.averageLatency ?? 0
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

// Helper to create audit context from Elysia context
function auditCtx(ctx: {
	db: Database
	workspaceId: string
	user: AuthUserContext
	request: Request
}) {
	return {
		db: ctx.db,
		workspaceId: ctx.workspaceId,
		userId: ctx.user.id,
		headers: ctx.request.headers,
	}
}

// =============================================================================
// Routes
// =============================================================================

export const agentRoutes = new Elysia({ prefix: '/agents', name: 'agent-routes' })
	// --- Write-access routes ---
	.use(writePlugin)

	// List agents
	.get(
		'/',
		async ({ db, workspaceId }) => {
			const results = await db.select().from(agents).where(eq(agents.workspaceId, workspaceId))

			const agentIds = results.map((a) => a.id)
			const allAgentTools =
				agentIds.length > 0
					? await db.select().from(agentTools).where(inArray(agentTools.agentId, agentIds))
					: []

			const toolIdsByAgentId = new Map<string, string[]>()
			for (const at of allAgentTools) {
				const existing = toolIdsByAgentId.get(at.agentId) || []
				existing.push(at.toolId)
				toolIdsByAgentId.set(at.agentId, existing)
			}

			return {
				agents: results.map((agent) => serializeAgent(agent, toolIdsByAgentId.get(agent.id) || [])),
			}
		},
		{ writeAccess: true },
	)

	// Get agent
	.get(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })
			const toolIds = await getAgentToolIds(agent.id, db)
			return serializeAgent(agent, toolIds)
		},
		{ writeAccess: true },
	)

	// Create agent
	.post(
		'/',
		async (ctx) => {
			const { db, workspaceId, user, body } = ctx
			const [agent] = await db
				.insert(agents)
				.values({
					workspaceId,
					name: body.name,
					description: body.description,
					model: body.model,
					instructions: body.instructions,
					config: body.config,
					systemToolsEnabled: body.systemToolsEnabled ?? true,
					createdBy: user.id,
				})
				.returning()

			if (!agent) throw new Error('Failed to create agent')

			if (body.toolIds && body.toolIds.length > 0) {
				const customToolIds = body.toolIds.filter((id: string) => !isSystemToolId(id))
				if (customToolIds.length > 0) {
					await db
						.insert(agentTools)
						.values(customToolIds.map((toolId: string) => ({ agentId: agent.id, toolId })))
				}
			}

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.AGENT_CREATE,
				resourceType: 'agent',
				resourceId: agent.id,
				details: { name: agent.name, model: agent.model, toolIds: body.toolIds ?? [] },
			})

			return serializeAgent(agent, body.toolIds || [])
		},
		{ writeAccess: true, body: CreateAgentSchema },
	)

	// Update agent
	.patch(
		'/:id',
		async (ctx) => {
			const { db, workspaceId, params, body } = ctx
			const existing = await findAgent({ id: params.id, workspaceId, db })
			if (!existing) return status(404, { error: 'Agent not found' })

			const updateData: Partial<typeof agents.$inferInsert> = {
				updatedAt: new Date(),
				...(body.name !== undefined && { name: body.name }),
				...(body.description !== undefined && { description: body.description }),
				...(body.model !== undefined && { model: body.model }),
				...(body.instructions !== undefined && { instructions: body.instructions }),
				...(body.config !== undefined && { config: body.config }),
				...(body.systemToolsEnabled !== undefined && {
					systemToolsEnabled: body.systemToolsEnabled,
				}),
				...(body.status !== undefined && { status: body.status }),
			}

			const [agent] = await db
				.update(agents)
				.set(updateData)
				.where(eq(agents.id, params.id))
				.returning()
			if (!agent) throw new Error('Failed to update agent')

			if (body.toolIds !== undefined) {
				await db.delete(agentTools).where(eq(agentTools.agentId, params.id))
				const customToolIds = body.toolIds.filter((toolId: string) => !isSystemToolId(toolId))
				if (customToolIds.length > 0) {
					await db
						.insert(agentTools)
						.values(customToolIds.map((toolId: string) => ({ agentId: params.id, toolId })))
				}
			}

			const toolIds = await getAgentToolIds(params.id, db)

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.AGENT_UPDATE,
				resourceType: 'agent',
				resourceId: params.id,
				details: {
					updatedFields: Object.keys(body).filter(
						(key) => body[key as keyof typeof body] !== undefined,
					),
					name: agent.name,
				},
			})

			return serializeAgent(agent, toolIds)
		},
		{ writeAccess: true, body: UpdateAgentSchema },
	)

	// Preview/validate agent config
	.post(
		'/preview',
		async ({ body }) => {
			const errors: z.infer<typeof ValidationIssueSchema>[] = []
			const warnings: z.infer<typeof ValidationIssueSchema>[] = []

			const name = body.name ?? ''
			const instructions = body.instructions ?? ''
			const model = body.model ?? ''

			if (!name || name.trim().length === 0) {
				errors.push({ field: 'name', message: 'Agent name is required', type: 'error' })
			}
			if (!instructions || instructions.trim().length === 0) {
				warnings.push({
					field: 'instructions',
					message: 'Agent should have instructions for best results',
					type: 'warning',
				})
			}
			if (!model) {
				errors.push({ field: 'model', message: 'Model is required', type: 'error' })
			}

			return { valid: errors.length === 0, errors, warnings }
		},
		{ writeAccess: true, body: AgentPreviewInputSchema },
	)

	// Get agent health
	.get(
		'/:id/health',
		async ({ db, workspaceId, params }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })
			return getAgentHealthMetrics({ agentId: agent.id, agentName: agent.name, db })
		},
		{ writeAccess: true },
	)

	// Get deployment info
	.get(
		'/:id/deployment',
		async ({ db, workspaceId, params }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })
			if (agent.status !== config.enums.agentStatus.DEPLOYED) {
				return status(400, { error: 'Agent is not deployed' })
			}

			const [deployment] = await db
				.select()
				.from(deployments)
				.where(eq(deployments.agentId, params.id))
				.orderBy(desc(deployments.deployedAt))
				.limit(1)

			if (!deployment) return status(404, { error: 'Deployment not found' })
			const baseUrl = deployment.url || `/api/agents/${params.id}`

			return {
				id: deployment.id,
				status: deployment.status as z.infer<typeof DeploymentSchema>['status'],
				deployedAt: deployment.deployedAt.toISOString(),
				version: deployment.version,
				url: baseUrl,
				endpoints: {
					chat: `${baseUrl}/chat`,
					websocket: `/api/agents/${params.id}/ws`,
					state: `${baseUrl}/state`,
				},
			}
		},
		{ writeAccess: true },
	)

	// Get deployment history
	.get(
		'/:id/deployments',
		async ({ db, workspaceId, params, query }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			const limit = Number(query?.limit) || 10
			const history = await db
				.select()
				.from(deployments)
				.where(eq(deployments.agentId, params.id))
				.orderBy(desc(deployments.deployedAt))
				.limit(limit)

			return {
				deployments: history.map((d) => {
					const baseUrl = d.url || `/api/agents/${params.id}`
					return {
						id: d.id,
						status: d.status as z.infer<typeof DeploymentSchema>['status'],
						deployedAt: d.deployedAt.toISOString(),
						version: d.version,
						url: baseUrl,
						endpoints: {
							chat: `${baseUrl}/chat`,
							websocket: `/api/agents/${params.id}/ws`,
							state: `${baseUrl}/state`,
						},
					}
				}),
			}
		},
		{ writeAccess: true },
	)

	// Get version history
	.get(
		'/:id/versions',
		async ({ db, workspaceId, params, query }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			const limit = Number(query?.limit) || 20
			const offset = Number(query?.offset) || 0

			const [countResult] = await db
				.select({ total: count() })
				.from(agentVersions)
				.where(eq(agentVersions.agentId, params.id))

			const total = countResult?.total ?? 0

			const versions = await db
				.select()
				.from(agentVersions)
				.where(eq(agentVersions.agentId, params.id))
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
		},
		{ writeAccess: true },
	)

	// Clone agent
	.post(
		'/:id/clone',
		async (ctx) => {
			const { db, workspaceId, user, params } = ctx
			const sourceAgent = await findAgent({ id: params.id, workspaceId, db })
			if (!sourceAgent) return status(404, { error: 'Agent not found' })

			const sourceToolIds = await getAgentToolIds(params.id, db)

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

			if (!clonedAgent) throw new Error('Failed to clone agent')

			if (sourceToolIds.length > 0) {
				const customToolIds = sourceToolIds.filter((id) => !isSystemToolId(id))
				if (customToolIds.length > 0) {
					await db
						.insert(agentTools)
						.values(customToolIds.map((toolId) => ({ agentId: clonedAgent.id, toolId })))
				}
			}

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.AGENT_CLONE,
				resourceType: 'agent',
				resourceId: clonedAgent.id,
				details: {
					sourceAgentId: params.id,
					sourceAgentName: sourceAgent.name,
					clonedAgentName: clonedAgent.name,
					toolIds: sourceToolIds,
				},
			})

			return { id: clonedAgent.id, redirectUrl: `/dashboard/agents/${clonedAgent.id}` }
		},
		{ writeAccess: true },
	)

	// --- Admin-access routes ---
	.use(adminPlugin)

	// Delete agent
	.delete(
		'/:id',
		async (ctx) => {
			const { db, workspaceId, params } = ctx
			const result = await db
				.delete(agents)
				.where(and(eq(agents.id, params.id), eq(agents.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'Agent not found' })

			const deletedAgent = result[0]
			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.AGENT_DELETE,
				resourceType: 'agent',
				resourceId: params.id,
				details: { name: deletedAgent?.name },
			})

			return { success: true }
		},
		{ adminAccess: true },
	)

	// Deploy agent
	.post(
		'/:id/deploy',
		async (ctx) => {
			const { db, workspaceId, user, params, body } = ctx
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })
			if (!agent.instructions)
				return status(400, { error: 'Agent must have instructions before deployment' })

			const toolIds = await getAgentToolIds(params.id, db)

			const [maxVersionResult] = await db
				.select({ maxVersion: max(agentVersions.version) })
				.from(agentVersions)
				.where(eq(agentVersions.agentId, params.id))

			const nextVersion = (maxVersionResult?.maxVersion ?? 0) + 1

			const [agentVersion] = await db
				.insert(agentVersions)
				.values({
					agentId: params.id,
					version: nextVersion,
					instructions: agent.instructions,
					model: agent.model,
					config: agent.config,
					toolIds,
					createdBy: user.id,
				})
				.returning()

			if (!agentVersion) throw new Error('Failed to create agent version')

			await db
				.update(agents)
				.set({ status: config.enums.agentStatus.DEPLOYED, updatedAt: new Date() })
				.where(eq(agents.id, params.id))

			const version = body?.version || `${nextVersion}.0.0`

			const [deployment] = await db
				.insert(deployments)
				.values({
					agentId: params.id,
					version,
					status: config.enums.deploymentStatus.ACTIVE,
					url: `/api/agents/${params.id}`,
					deployedBy: user.id,
					metadata: agent.config ? { config: agent.config } : null,
				})
				.returning()

			if (!deployment) throw new Error('Failed to create deployment')

			const baseUrl = `/api/agents/${params.id}`

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.AGENT_DEPLOY,
				resourceType: 'agent',
				resourceId: params.id,
				details: { name: agent.name, version, deploymentId: deployment.id, model: agent.model },
			})

			return {
				id: deployment.id,
				status: config.enums.deploymentStatus.ACTIVE,
				deployedAt: deployment.deployedAt.toISOString(),
				version,
				url: baseUrl,
				endpoints: {
					chat: `${baseUrl}/chat`,
					websocket: `/api/agents/${params.id}/ws`,
					state: `${baseUrl}/state`,
				},
			}
		},
		{
			adminAccess: true,
			body: z.object({ version: z.string().optional() }).optional(),
		},
	)

	// Undeploy agent
	.post(
		'/:id/undeploy',
		async ({ db, workspaceId, params }) => {
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			await db
				.update(agents)
				.set({ status: config.enums.agentStatus.DRAFT, updatedAt: new Date() })
				.where(eq(agents.id, params.id))

			await db
				.update(deployments)
				.set({ status: config.enums.deploymentStatus.INACTIVE })
				.where(eq(deployments.agentId, params.id))

			return { success: true }
		},
		{ adminAccess: true },
	)

	// Rollback agent
	.post(
		'/:id/rollback',
		async (ctx) => {
			const { db, workspaceId, user, params, body } = ctx
			const agent = await findAgent({ id: params.id, workspaceId, db })
			if (!agent) return status(404, { error: 'Agent not found' })

			const [targetVersionRecord] = await db
				.select()
				.from(agentVersions)
				.where(and(eq(agentVersions.agentId, params.id), eq(agentVersions.version, body.version)))

			if (!targetVersionRecord) return status(404, { error: `Version ${body.version} not found` })

			const [maxVersionResult] = await db
				.select({ maxVersion: max(agentVersions.version) })
				.from(agentVersions)
				.where(eq(agentVersions.agentId, params.id))

			const previousVersion = maxVersionResult?.maxVersion ?? 0
			const newVersionNumber = previousVersion + 1

			await db
				.update(agents)
				.set({
					instructions: targetVersionRecord.instructions,
					model: targetVersionRecord.model,
					config: targetVersionRecord.config,
					updatedAt: new Date(),
				})
				.where(eq(agents.id, params.id))

			await db.delete(agentTools).where(eq(agentTools.agentId, params.id))
			const restoredToolIds = targetVersionRecord.toolIds ?? []
			if (restoredToolIds.length > 0) {
				const customToolIds = restoredToolIds.filter((toolId) => !isSystemToolId(toolId))
				if (customToolIds.length > 0) {
					await db
						.insert(agentTools)
						.values(customToolIds.map((toolId) => ({ agentId: params.id, toolId })))
				}
			}

			const [newAgentVersion] = await db
				.insert(agentVersions)
				.values({
					agentId: params.id,
					version: newVersionNumber,
					instructions: targetVersionRecord.instructions,
					model: targetVersionRecord.model,
					config: targetVersionRecord.config,
					toolIds: restoredToolIds,
					createdBy: user.id,
				})
				.returning()

			if (!newAgentVersion) throw new Error('Failed to create rollback version')

			let deploymentInfo: z.infer<typeof DeploymentSchema> | undefined
			if (agent.status === config.enums.agentStatus.DEPLOYED) {
				await db
					.update(deployments)
					.set({ status: config.enums.deploymentStatus.INACTIVE })
					.where(eq(deployments.agentId, params.id))

				const version = `${newVersionNumber}.0.0`
				const [deployment] = await db
					.insert(deployments)
					.values({
						agentId: params.id,
						version,
						status: config.enums.deploymentStatus.ACTIVE,
						url: `/api/agents/${params.id}`,
						deployedBy: user.id,
						metadata: targetVersionRecord.config ? { config: targetVersionRecord.config } : null,
					})
					.returning()

				if (deployment) {
					const baseUrl = `/api/agents/${params.id}`
					deploymentInfo = {
						id: deployment.id,
						status: config.enums.deploymentStatus.ACTIVE,
						deployedAt: deployment.deployedAt.toISOString(),
						version,
						url: baseUrl,
						endpoints: {
							chat: `${baseUrl}/chat`,
							websocket: `/api/agents/${params.id}/ws`,
							state: `${baseUrl}/state`,
						},
					}
				}
			}

			return {
				success: true,
				previousVersion,
				restoredVersion: body.version,
				newVersion: newVersionNumber,
				deployment: deploymentInfo,
			}
		},
		{ adminAccess: true, body: RollbackAgentSchema },
	)
