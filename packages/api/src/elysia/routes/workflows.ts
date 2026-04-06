/**
 * Workflow Routes
 *
 * Multi-agent workflow CRUD, node/edge management, and execution.
 */

import {
	workflowEdges,
	workflowExecutions,
	workflowNodes,
	workflowStepExecutions,
	workflows,
} from '@hare/db/schema'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import {
	CreateWorkflowEdgeSchema,
	CreateWorkflowNodeSchema,
	CreateWorkflowSchema,
	type WorkflowEdgeSchema,
	type WorkflowExecutionSchema,
	type WorkflowNodeSchema,
	type WorkflowSchema,
	type WorkflowStepExecutionSchema,
	UpdateWorkflowSchema,
} from '../../schemas'
import { adminPlugin, writePlugin } from '../context'

// =============================================================================
// Helpers
// =============================================================================

function serializeWorkflow(
	w: typeof workflows.$inferSelect,
	nodes?: z.infer<typeof WorkflowNodeSchema>[],
	edges?: z.infer<typeof WorkflowEdgeSchema>[],
): z.infer<typeof WorkflowSchema> {
	return {
		id: w.id,
		workspaceId: w.workspaceId,
		name: w.name,
		description: w.description,
		status: w.status as z.infer<typeof WorkflowSchema>['status'],
		nodes,
		edges,
		createdAt: w.createdAt.toISOString(),
		updatedAt: w.updatedAt.toISOString(),
	}
}

function serializeNode(
	n: typeof workflowNodes.$inferSelect,
): z.infer<typeof WorkflowNodeSchema> {
	return {
		id: n.id,
		workflowId: n.workflowId,
		type: n.type as z.infer<typeof WorkflowNodeSchema>['type'],
		agentId: n.agentId,
		label: n.label,
		config: n.config as z.infer<typeof WorkflowNodeSchema>['config'],
		positionX: n.positionX,
		positionY: n.positionY,
	}
}

function serializeEdge(
	e: typeof workflowEdges.$inferSelect,
): z.infer<typeof WorkflowEdgeSchema> {
	return {
		id: e.id,
		workflowId: e.workflowId,
		sourceNodeId: e.sourceNodeId,
		targetNodeId: e.targetNodeId,
		label: e.label,
		config: e.config as z.infer<typeof WorkflowEdgeSchema>['config'],
	}
}

// =============================================================================
// Routes
// =============================================================================

export const workflowRoutes = new Elysia({ prefix: '/workflows', name: 'workflow-routes' })
	.use(writePlugin)

	// List workflows in workspace
	.get(
		'/',
		async ({ db, workspaceId }) => {
			const results = await db
				.select()
				.from(workflows)
				.where(eq(workflows.workspaceId, workspaceId))
				.orderBy(desc(workflows.createdAt))

			return {
				workflows: results.map((w) => serializeWorkflow(w)),
			}
		},
		{ writeAccess: true },
	)

	// Get a workflow with its nodes and edges
	.get(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const [workflow] = await db
				.select()
				.from(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))

			if (!workflow) return status(404, { error: 'Workflow not found' })

			const nodes = await db
				.select()
				.from(workflowNodes)
				.where(eq(workflowNodes.workflowId, params.id))

			const edges = await db
				.select()
				.from(workflowEdges)
				.where(eq(workflowEdges.workflowId, params.id))

			return serializeWorkflow(workflow, nodes.map(serializeNode), edges.map(serializeEdge))
		},
		{ writeAccess: true },
	)

	// Create a workflow
	.post(
		'/',
		async ({ db, workspaceId, user, body }) => {
			const [workflow] = await db
				.insert(workflows)
				.values({
					workspaceId,
					name: body.name,
					description: body.description,
					createdBy: user.id,
				})
				.returning()

			if (!workflow) throw new Error('Failed to create workflow')

			return serializeWorkflow(workflow, [], [])
		},
		{ writeAccess: true, body: CreateWorkflowSchema },
	)

	// Update a workflow
	.patch(
		'/:id',
		async ({ db, workspaceId, params, body }) => {
			const updateData: Partial<typeof workflows.$inferInsert> = {
				updatedAt: new Date(),
				...(body.name !== undefined && { name: body.name }),
				...(body.description !== undefined && { description: body.description }),
				...(body.status !== undefined && { status: body.status }),
			}

			const [workflow] = await db
				.update(workflows)
				.set(updateData)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
				.returning()

			if (!workflow) return status(404, { error: 'Workflow not found' })

			return serializeWorkflow(workflow)
		},
		{ writeAccess: true, body: UpdateWorkflowSchema },
	)

	// Add a node to a workflow
	.post(
		'/:id/nodes',
		async ({ db, workspaceId, params, body }) => {
			// Verify workflow belongs to workspace
			const [workflow] = await db
				.select()
				.from(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
			if (!workflow) return status(404, { error: 'Workflow not found' })

			const [node] = await db
				.insert(workflowNodes)
				.values({
					workflowId: params.id,
					type: body.type,
					agentId: body.agentId,
					label: body.label,
					config: body.config,
					positionX: body.positionX ?? 0,
					positionY: body.positionY ?? 0,
				})
				.returning()

			if (!node) throw new Error('Failed to add node')

			return serializeNode(node)
		},
		{
			writeAccess: true,
			body: CreateWorkflowNodeSchema.omit({ workflowId: true }),
		},
	)

	// Remove a node from a workflow
	.delete(
		'/:id/nodes/:nodeId',
		async ({ db, workspaceId, params }) => {
			// Verify workflow belongs to workspace
			const [workflow] = await db
				.select()
				.from(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
			if (!workflow) return status(404, { error: 'Workflow not found' })

			await db.delete(workflowNodes).where(eq(workflowNodes.id, params.nodeId))

			return { success: true }
		},
		{ writeAccess: true },
	)

	// Add an edge to a workflow
	.post(
		'/:id/edges',
		async ({ db, workspaceId, params, body }) => {
			// Verify workflow belongs to workspace
			const [workflow] = await db
				.select()
				.from(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
			if (!workflow) return status(404, { error: 'Workflow not found' })

			const [edge] = await db
				.insert(workflowEdges)
				.values({
					workflowId: params.id,
					sourceNodeId: body.sourceNodeId,
					targetNodeId: body.targetNodeId,
					label: body.label,
					config: body.config,
				})
				.returning()

			if (!edge) throw new Error('Failed to add edge')

			return serializeEdge(edge)
		},
		{
			writeAccess: true,
			body: CreateWorkflowEdgeSchema.omit({ workflowId: true }),
		},
	)

	// Remove an edge from a workflow
	.delete(
		'/:id/edges/:edgeId',
		async ({ db, workspaceId, params }) => {
			const [workflow] = await db
				.select()
				.from(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
			if (!workflow) return status(404, { error: 'Workflow not found' })

			await db.delete(workflowEdges).where(eq(workflowEdges.id, params.edgeId))

			return { success: true }
		},
		{ writeAccess: true },
	)

	// Execute a workflow
	.post(
		'/:id/execute',
		async ({ db, workspaceId, user, params, body }) => {
			// Verify workflow belongs to workspace and is active
			const [workflow] = await db
				.select()
				.from(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
			if (!workflow) return status(404, { error: 'Workflow not found' })

			const [execution] = await db
				.insert(workflowExecutions)
				.values({
					workflowId: params.id,
					workspaceId,
					status: 'pending',
					input: { message: body?.message, data: body?.data },
					triggeredBy: user.id,
				})
				.returning()

			if (!execution) throw new Error('Failed to create execution')

			// TODO: Trigger async workflow execution pipeline
			// 1. Load workflow nodes and edges
			// 2. Find input node, start execution
			// 3. For each node, route to appropriate agent DO
			// 4. Pass output to next node(s) via edges
			// 5. Handle parallel/router/condition logic
			// 6. Update step executions and final execution status

			return {
				id: execution.id,
				workflowId: execution.workflowId,
				status: execution.status as z.infer<typeof WorkflowExecutionSchema>['status'],
				input: execution.input as z.infer<typeof WorkflowExecutionSchema>['input'],
				output: null,
				startedAt: execution.startedAt.toISOString(),
				completedAt: null,
				durationMs: null,
				error: null,
			}
		},
		{
			writeAccess: true,
			body: z
				.object({
					message: z.string().optional(),
					data: z.record(z.string(), z.unknown()).optional(),
				})
				.optional(),
		},
	)

	// Get execution history for a workflow
	.get(
		'/:id/executions',
		async ({ db, workspaceId, params, query }) => {
			const limit = Number(query?.limit) || 20

			const [countResult] = await db
				.select({ total: count() })
				.from(workflowExecutions)
				.where(
					and(
						eq(workflowExecutions.workflowId, params.id),
						eq(workflowExecutions.workspaceId, workspaceId),
					),
				)

			const results = await db
				.select()
				.from(workflowExecutions)
				.where(
					and(
						eq(workflowExecutions.workflowId, params.id),
						eq(workflowExecutions.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(workflowExecutions.startedAt))
				.limit(limit)

			return {
				executions: results.map((e) => ({
					id: e.id,
					workflowId: e.workflowId,
					status: e.status as z.infer<typeof WorkflowExecutionSchema>['status'],
					input: e.input as z.infer<typeof WorkflowExecutionSchema>['input'],
					output: e.output as z.infer<typeof WorkflowExecutionSchema>['output'],
					startedAt: e.startedAt.toISOString(),
					completedAt: e.completedAt?.toISOString() ?? null,
					durationMs: e.durationMs,
					error: e.error,
				})),
				total: countResult?.total ?? 0,
			}
		},
		{ writeAccess: true },
	)

	// Get execution details with step-level information
	.get(
		'/executions/:id',
		async ({ db, workspaceId, params }) => {
			const [execution] = await db
				.select()
				.from(workflowExecutions)
				.where(
					and(
						eq(workflowExecutions.id, params.id),
						eq(workflowExecutions.workspaceId, workspaceId),
					),
				)

			if (!execution) return status(404, { error: 'Execution not found' })

			const steps = await db
				.select()
				.from(workflowStepExecutions)
				.where(eq(workflowStepExecutions.executionId, params.id))

			// Get node labels
			const nodeIds = steps.map((s) => s.nodeId)
			let nodeLabelMap = new Map<string, string>()
			if (nodeIds.length > 0) {
				const nodes = await db
					.select({ id: workflowNodes.id, label: workflowNodes.label })
					.from(workflowNodes)
					.where(inArray(workflowNodes.id, nodeIds))
				nodeLabelMap = new Map(nodes.map((n) => [n.id, n.label]))
			}

			return {
				execution: {
					id: execution.id,
					workflowId: execution.workflowId,
					status: execution.status as z.infer<typeof WorkflowExecutionSchema>['status'],
					input: execution.input as z.infer<typeof WorkflowExecutionSchema>['input'],
					output: execution.output as z.infer<typeof WorkflowExecutionSchema>['output'],
					startedAt: execution.startedAt.toISOString(),
					completedAt: execution.completedAt?.toISOString() ?? null,
					durationMs: execution.durationMs,
					error: execution.error,
				},
				steps: steps.map((s) => ({
					id: s.id,
					executionId: s.executionId,
					nodeId: s.nodeId,
					nodeLabel: nodeLabelMap.get(s.nodeId),
					agentId: s.agentId,
					status: s.status as z.infer<typeof WorkflowStepExecutionSchema>['status'],
					input: s.input as z.infer<typeof WorkflowStepExecutionSchema>['input'],
					output: s.output as z.infer<typeof WorkflowStepExecutionSchema>['output'],
					startedAt: s.startedAt?.toISOString() ?? null,
					completedAt: s.completedAt?.toISOString() ?? null,
					durationMs: s.durationMs,
					error: s.error,
				})),
			}
		},
		{ writeAccess: true },
	)

	// --- Admin-access routes ---
	.use(adminPlugin)

	// Delete a workflow
	.delete(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const result = await db
				.delete(workflows)
				.where(and(eq(workflows.id, params.id), eq(workflows.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'Workflow not found' })

			return { success: true }
		},
		{ adminAccess: true },
	)
