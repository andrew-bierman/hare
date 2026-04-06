/**
 * oRPC Workflows Router
 *
 * Handles multi-agent workflow CRUD, node/edge management, and execution.
 */

import {
<<<<<<< Updated upstream
=======
	agents,
>>>>>>> Stashed changes
	workflowEdges,
	workflowExecutions,
	workflowNodes,
	workflowStepExecutions,
	workflows,
} from '@hare/db/schema'
<<<<<<< Updated upstream
import { and, count, desc, eq } from 'drizzle-orm'
=======
import { and, count, desc, eq, inArray } from 'drizzle-orm'
>>>>>>> Stashed changes
import { z } from 'zod'
import {
	CreateWorkflowEdgeSchema,
	CreateWorkflowNodeSchema,
	CreateWorkflowSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateWorkflowSchema,
	WorkflowEdgeSchema,
	WorkflowExecutionSchema,
	WorkflowNodeSchema,
	WorkflowSchema,
	WorkflowStepExecutionSchema,
} from '../../schemas'
import { notFound, requireAdmin, requireWrite, serverError } from '../base'

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
<<<<<<< Updated upstream
=======
		canvasLayout: w.canvasLayout ?? null,
>>>>>>> Stashed changes
		nodes,
		edges,
		createdAt: w.createdAt.toISOString(),
		updatedAt: w.updatedAt.toISOString(),
	}
}

function serializeNode(n: typeof workflowNodes.$inferSelect): z.infer<typeof WorkflowNodeSchema> {
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

function serializeEdge(e: typeof workflowEdges.$inferSelect): z.infer<typeof WorkflowEdgeSchema> {
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
// Workflow CRUD
// =============================================================================

/**
 * List workflows in workspace
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/workflows' })
	.output(z.object({ workflows: z.array(WorkflowSchema) }))
	.handler(async ({ context }) => {
		const { db, workspaceId } = context

		const results = await db
			.select()
			.from(workflows)
			.where(eq(workflows.workspaceId, workspaceId))
			.orderBy(desc(workflows.createdAt))

		return {
			workflows: results.map((w) => serializeWorkflow(w)),
		}
	})

/**
 * Get a workflow with its nodes and edges
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/workflows/{id}' })
	.input(IdParamSchema)
	.output(WorkflowSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [workflow] = await db
			.select()
			.from(workflows)
			.where(and(eq(workflows.id, input.id), eq(workflows.workspaceId, workspaceId)))

		if (!workflow) notFound('Workflow not found')

		const nodes = await db
			.select()
			.from(workflowNodes)
			.where(eq(workflowNodes.workflowId, input.id))

		const edges = await db
			.select()
			.from(workflowEdges)
			.where(eq(workflowEdges.workflowId, input.id))

		return serializeWorkflow(workflow, nodes.map(serializeNode), edges.map(serializeEdge))
	})

/**
 * Create a workflow
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/workflows', successStatus: 201 })
	.input(CreateWorkflowSchema)
	.output(WorkflowSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		const [workflow] = await db
			.insert(workflows)
			.values({
				workspaceId,
				name: input.name,
				description: input.description,
				createdBy: user.id,
			})
			.returning()

		if (!workflow) serverError('Failed to create workflow')

		return serializeWorkflow(workflow, [], [])
	})

/**
 * Update a workflow
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/workflows/{id}' })
	.input(IdParamSchema.merge(UpdateWorkflowSchema))
	.output(WorkflowSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const updateData: Partial<typeof workflows.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.status !== undefined && { status: data.status }),
<<<<<<< Updated upstream
=======
			...(data.canvasLayout !== undefined && { canvasLayout: data.canvasLayout }),
>>>>>>> Stashed changes
		}

		const [workflow] = await db
			.update(workflows)
			.set(updateData)
			.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
			.returning()

		if (!workflow) notFound('Workflow not found')

		return serializeWorkflow(workflow)
	})

/**
 * Delete a workflow
 */
export const remove = requireAdmin
	.route({ method: 'DELETE', path: '/workflows/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(workflows)
			.where(and(eq(workflows.id, input.id), eq(workflows.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('Workflow not found')

		return { success: true }
	})

// =============================================================================
// Node Management
// =============================================================================

/**
 * Add a node to a workflow
 */
export const addNode = requireWrite
	.route({ method: 'POST', path: '/workflows/{id}/nodes', successStatus: 201 })
	.input(IdParamSchema.merge(CreateWorkflowNodeSchema.omit({ workflowId: true })))
	.output(WorkflowNodeSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		// Verify workflow belongs to workspace
		const [workflow] = await db
			.select()
			.from(workflows)
			.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
		if (!workflow) notFound('Workflow not found')

<<<<<<< Updated upstream
=======
		// Verify agentId belongs to workspace
		if (data.agentId) {
			const [agent] = await db
				.select()
				.from(agents)
				.where(and(eq(agents.id, data.agentId), eq(agents.workspaceId, workspaceId)))
			if (!agent) notFound('Agent not found')
		}

>>>>>>> Stashed changes
		const [node] = await db
			.insert(workflowNodes)
			.values({
				workflowId: id,
				type: data.type,
				agentId: data.agentId,
				label: data.label,
				config: data.config,
				positionX: data.positionX ?? 0,
				positionY: data.positionY ?? 0,
			})
			.returning()

		if (!node) serverError('Failed to add node')

		return serializeNode(node)
	})

/**
 * Remove a node from a workflow
 */
export const removeNode = requireWrite
	.route({ method: 'DELETE', path: '/workflows/{id}/nodes/{nodeId}' })
	.input(IdParamSchema.extend({ nodeId: z.string() }))
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify workflow belongs to workspace
		const [workflow] = await db
			.select()
			.from(workflows)
			.where(and(eq(workflows.id, input.id), eq(workflows.workspaceId, workspaceId)))
		if (!workflow) notFound('Workflow not found')

<<<<<<< Updated upstream
		await db.delete(workflowNodes).where(eq(workflowNodes.id, input.nodeId))
=======
		// Scope delete by both nodeId and workflowId
		const result = await db
			.delete(workflowNodes)
			.where(and(eq(workflowNodes.id, input.nodeId), eq(workflowNodes.workflowId, input.id)))
			.returning()

		if (result.length === 0) notFound('Node not found')
>>>>>>> Stashed changes

		return { success: true }
	})

// =============================================================================
// Edge Management
// =============================================================================

/**
 * Add an edge to a workflow
 */
export const addEdge = requireWrite
	.route({ method: 'POST', path: '/workflows/{id}/edges', successStatus: 201 })
	.input(IdParamSchema.merge(CreateWorkflowEdgeSchema.omit({ workflowId: true })))
	.output(WorkflowEdgeSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		// Verify workflow belongs to workspace
		const [workflow] = await db
			.select()
			.from(workflows)
			.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
		if (!workflow) notFound('Workflow not found')

<<<<<<< Updated upstream
=======
		// Verify both source and target nodes belong to this workflow
		const [sourceNode] = await db
			.select()
			.from(workflowNodes)
			.where(and(eq(workflowNodes.id, data.sourceNodeId), eq(workflowNodes.workflowId, id)))
		if (!sourceNode) notFound('Source node not found')

		const [targetNode] = await db
			.select()
			.from(workflowNodes)
			.where(and(eq(workflowNodes.id, data.targetNodeId), eq(workflowNodes.workflowId, id)))
		if (!targetNode) notFound('Target node not found')

>>>>>>> Stashed changes
		const [edge] = await db
			.insert(workflowEdges)
			.values({
				workflowId: id,
				sourceNodeId: data.sourceNodeId,
				targetNodeId: data.targetNodeId,
				label: data.label,
				config: data.config,
			})
			.returning()

		if (!edge) serverError('Failed to add edge')

		return serializeEdge(edge)
	})

/**
 * Remove an edge from a workflow
 */
export const removeEdge = requireWrite
	.route({ method: 'DELETE', path: '/workflows/{id}/edges/{edgeId}' })
	.input(IdParamSchema.extend({ edgeId: z.string() }))
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

<<<<<<< Updated upstream
=======
		// Verify workflow belongs to workspace
>>>>>>> Stashed changes
		const [workflow] = await db
			.select()
			.from(workflows)
			.where(and(eq(workflows.id, input.id), eq(workflows.workspaceId, workspaceId)))
		if (!workflow) notFound('Workflow not found')

<<<<<<< Updated upstream
		await db.delete(workflowEdges).where(eq(workflowEdges.id, input.edgeId))
=======
		// Scope delete by both edgeId and workflowId
		const result = await db
			.delete(workflowEdges)
			.where(and(eq(workflowEdges.id, input.edgeId), eq(workflowEdges.workflowId, input.id)))
			.returning()

		if (result.length === 0) notFound('Edge not found')
>>>>>>> Stashed changes

		return { success: true }
	})

// =============================================================================
// Execution
// =============================================================================

/**
 * Execute a workflow
 */
export const execute = requireWrite
	.route({ method: 'POST', path: '/workflows/{id}/execute', successStatus: 201 })
	.input(
		IdParamSchema.extend({
			message: z.string().optional(),
			data: z.record(z.string(), z.unknown()).optional(),
		}),
	)
	.output(WorkflowExecutionSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Verify workflow belongs to workspace and is active
		const [workflow] = await db
			.select()
			.from(workflows)
<<<<<<< Updated upstream
			.where(and(eq(workflows.id, input.id), eq(workflows.workspaceId, workspaceId)))
		if (!workflow) notFound('Workflow not found')
=======
			.where(
				and(
					eq(workflows.id, input.id),
					eq(workflows.workspaceId, workspaceId),
					eq(workflows.status, 'active'),
				),
			)
		if (!workflow) notFound('Workflow not found or not active')
>>>>>>> Stashed changes

		const [execution] = await db
			.insert(workflowExecutions)
			.values({
				workflowId: input.id,
				workspaceId,
				status: 'pending',
				input: { message: input.message, data: input.data },
				triggeredBy: user.id,
			})
			.returning()

		if (!execution) serverError('Failed to create execution')

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
	})

/**
 * Get execution history for a workflow
 */
export const getExecutions = requireWrite
	.route({ method: 'GET', path: '/workflows/{id}/executions' })
	.input(
		IdParamSchema.extend({
			limit: z.coerce.number().int().min(1).max(100).optional().default(20),
		}),
	)
	.output(
		z.object({
			executions: z.array(WorkflowExecutionSchema),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [countResult] = await db
			.select({ total: count() })
			.from(workflowExecutions)
			.where(
				and(
					eq(workflowExecutions.workflowId, input.id),
					eq(workflowExecutions.workspaceId, workspaceId),
				),
			)

		const results = await db
			.select()
			.from(workflowExecutions)
			.where(
				and(
					eq(workflowExecutions.workflowId, input.id),
					eq(workflowExecutions.workspaceId, workspaceId),
				),
			)
			.orderBy(desc(workflowExecutions.startedAt))
			.limit(input.limit)

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
	})

/**
 * Get execution details with step-level information
 */
export const getExecutionDetails = requireWrite
	.route({ method: 'GET', path: '/workflows/executions/{id}' })
	.input(IdParamSchema)
	.output(
		z.object({
			execution: WorkflowExecutionSchema,
			steps: z.array(WorkflowStepExecutionSchema),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [execution] = await db
			.select()
			.from(workflowExecutions)
			.where(
				and(eq(workflowExecutions.id, input.id), eq(workflowExecutions.workspaceId, workspaceId)),
			)

		if (!execution) notFound('Execution not found')

		const steps = await db
			.select()
			.from(workflowStepExecutions)
			.where(eq(workflowStepExecutions.executionId, input.id))

		// Get node labels
		const nodeIds = steps.map((s) => s.nodeId)
		let nodeLabelMap = new Map<string, string>()
		if (nodeIds.length > 0) {
<<<<<<< Updated upstream
			const { inArray } = await import('drizzle-orm')
=======
>>>>>>> Stashed changes
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
	})

// =============================================================================
// Router Export
// =============================================================================

export const workflowsRouter = {
	list,
	get,
	create,
	update,
	delete: remove,
	addNode,
	removeNode,
	addEdge,
	removeEdge,
	execute,
	getExecutions,
	getExecutionDetails,
}
