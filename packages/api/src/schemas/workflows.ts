import { z } from '@hono/zod-openapi'

/**
 * Multi-agent workflow schemas.
 */

export const WorkflowStatusSchema = z
	.enum(['draft', 'active', 'archived'])
	.openapi({ example: 'draft' })

export const WorkflowNodeTypeSchema = z
	.enum(['agent', 'router', 'parallel', 'condition', 'input', 'output'])
	.openapi({ example: 'agent' })

export const WorkflowExecutionStatusSchema = z
	.enum(['pending', 'running', 'completed', 'failed', 'cancelled'])
	.openapi({ example: 'completed' })

export const WorkflowStepStatusSchema = z
	.enum(['pending', 'running', 'completed', 'failed', 'skipped'])
	.openapi({ example: 'completed' })

export const WorkflowNodeConfigSchema = z
	.object({
		routingPrompt: z.string().optional(),
		condition: z.string().optional(),
		instructionOverride: z.string().optional(),
		maxConcurrent: z.number().int().optional(),
		messageTemplate: z.string().optional(),
	})
	.openapi('WorkflowNodeConfig')

export const WorkflowEdgeConfigSchema = z
	.object({
		condition: z.string().optional(),
		priority: z.number().int().optional(),
	})
	.openapi('WorkflowEdgeConfig')

export const WorkflowNodeSchema = z
	.object({
		id: z.string(),
		workflowId: z.string(),
		type: WorkflowNodeTypeSchema,
		agentId: z.string().nullable(),
		label: z.string(),
		config: WorkflowNodeConfigSchema.nullable(),
		positionX: z.number().int(),
		positionY: z.number().int(),
	})
	.openapi('WorkflowNode')

export const WorkflowEdgeSchema = z
	.object({
		id: z.string(),
		workflowId: z.string(),
		sourceNodeId: z.string(),
		targetNodeId: z.string(),
		label: z.string().nullable(),
		config: WorkflowEdgeConfigSchema.nullable(),
	})
	.openapi('WorkflowEdge')

export const WorkflowSchema = z
	.object({
		id: z.string(),
		workspaceId: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		status: WorkflowStatusSchema,
		nodes: z.array(WorkflowNodeSchema).optional(),
		edges: z.array(WorkflowEdgeSchema).optional(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi('Workflow')

export const CreateWorkflowSchema = z
	.object({
		name: z.string().min(1).max(100).trim(),
		description: z.string().max(500).optional(),
	})
	.openapi('CreateWorkflow')

export const UpdateWorkflowSchema = z
	.object({
		name: z.string().min(1).max(100).trim().optional(),
		description: z.string().max(500).optional(),
		status: WorkflowStatusSchema.optional(),
	})
	.openapi('UpdateWorkflow')

export const CreateWorkflowNodeSchema = z
	.object({
		workflowId: z.string(),
		type: WorkflowNodeTypeSchema,
		agentId: z.string().optional(),
		label: z.string().min(1).max(100),
		config: WorkflowNodeConfigSchema.optional(),
		positionX: z.number().int().optional().default(0),
		positionY: z.number().int().optional().default(0),
	})
	.openapi('CreateWorkflowNode')

export const CreateWorkflowEdgeSchema = z
	.object({
		workflowId: z.string(),
		sourceNodeId: z.string(),
		targetNodeId: z.string(),
		label: z.string().optional(),
		config: WorkflowEdgeConfigSchema.optional(),
	})
	.openapi('CreateWorkflowEdge')

export const WorkflowExecutionSchema = z
	.object({
		id: z.string(),
		workflowId: z.string(),
		status: WorkflowExecutionStatusSchema,
		input: z.record(z.string(), z.unknown()).nullable(),
		output: z.record(z.string(), z.unknown()).nullable(),
		startedAt: z.string().datetime(),
		completedAt: z.string().datetime().nullable(),
		durationMs: z.number().int().nullable(),
		error: z.string().nullable(),
	})
	.openapi('WorkflowExecution')

export const WorkflowStepExecutionSchema = z
	.object({
		id: z.string(),
		executionId: z.string(),
		nodeId: z.string(),
		nodeLabel: z.string().optional(),
		agentId: z.string().nullable(),
		status: WorkflowStepStatusSchema,
		input: z.record(z.string(), z.unknown()).nullable(),
		output: z.record(z.string(), z.unknown()).nullable(),
		startedAt: z.string().datetime().nullable(),
		completedAt: z.string().datetime().nullable(),
		durationMs: z.number().int().nullable(),
		error: z.string().nullable(),
	})
	.openapi('WorkflowStepExecution')
