import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

/**
 * Multi-Agent Workflows - orchestrate multiple agents in sequence,
 * parallel, or router patterns. Leverages Durable Objects for
 * stateful agent-to-agent communication at the edge.
 */

export const WORKFLOW_STATUSES = ['draft', 'active', 'archived'] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const WORKFLOW_EXECUTION_STATUSES = [
	'pending',
	'running',
	'completed',
	'failed',
	'cancelled',
] as const
export type WorkflowExecutionStatus = (typeof WORKFLOW_EXECUTION_STATUSES)[number]

export const WORKFLOW_NODE_TYPES = [
	'agent',
	'router',
	'parallel',
	'condition',
	'input',
	'output',
] as const
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number]

export const WORKFLOW_STEP_STATUSES = [
	'pending',
	'running',
	'completed',
	'failed',
	'skipped',
] as const
export type WorkflowStepStatus = (typeof WORKFLOW_STEP_STATUSES)[number]

/**
 * Workflows define multi-agent orchestration patterns.
 */
export const workflows = sqliteTable(
	'workflows',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		status: text('status', { enum: WORKFLOW_STATUSES })
			.notNull()
			.default('draft')
			.$type<WorkflowStatus>(),
		/** Visual layout metadata for the workflow canvas */
		canvasLayout: text('canvasLayout', { mode: 'json' }).$type<{
			zoom?: number
			panX?: number
			panY?: number
		}>(),
		createdBy: text('createdBy')
			.notNull()
			.references(() => users.id),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updatedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('workflows_workspace_idx').on(table.workspaceId),
		index('workflows_status_idx').on(table.status),
	],
)

/**
 * Workflow nodes represent individual steps (agents, routers, conditions).
 */
export const workflowNodes = sqliteTable(
	'workflow_nodes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workflowId: text('workflowId')
			.notNull()
			.references(() => workflows.id, { onDelete: 'cascade' }),
		type: text('type', { enum: WORKFLOW_NODE_TYPES }).notNull().$type<WorkflowNodeType>(),
		/** Agent ID if type is 'agent' */
		agentId: text('agentId').references(() => agents.id, { onDelete: 'set null' }),
		/** Display label for the node */
		label: text('label').notNull(),
		/** Node-specific configuration */
		config: text('config', { mode: 'json' }).$type<{
			/** For router: routing instructions */
			routingPrompt?: string
			/** For condition: condition expression */
			condition?: string
			/** For agent: override instructions */
			instructionOverride?: string
			/** For parallel: max concurrent */
			maxConcurrent?: number
			/** For input: initial message template */
			messageTemplate?: string
		}>(),
		/** Canvas position */
		positionX: integer('positionX').notNull().default(0),
		positionY: integer('positionY').notNull().default(0),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('workflow_nodes_workflow_idx').on(table.workflowId),
		index('workflow_nodes_agent_idx').on(table.agentId),
	],
)

/**
 * Workflow edges connect nodes (defines execution flow).
 */
export const workflowEdges = sqliteTable(
	'workflow_edges',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workflowId: text('workflowId')
			.notNull()
			.references(() => workflows.id, { onDelete: 'cascade' }),
		sourceNodeId: text('sourceNodeId')
			.notNull()
			.references(() => workflowNodes.id, { onDelete: 'cascade' }),
		targetNodeId: text('targetNodeId')
			.notNull()
			.references(() => workflowNodes.id, { onDelete: 'cascade' }),
		/** Optional label for the edge (e.g., condition branch name) */
		label: text('label'),
		/** Edge-specific config (e.g., condition for branching) */
		config: text('config', { mode: 'json' }).$type<{
			condition?: string
			priority?: number
		}>(),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('workflow_edges_workflow_idx').on(table.workflowId),
		index('workflow_edges_source_idx').on(table.sourceNodeId),
		index('workflow_edges_target_idx').on(table.targetNodeId),
	],
)

/**
 * Workflow executions track individual runs of a workflow.
 */
export const workflowExecutions = sqliteTable(
	'workflow_executions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		workflowId: text('workflowId')
			.notNull()
			.references(() => workflows.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		status: text('status', { enum: WORKFLOW_EXECUTION_STATUSES })
			.notNull()
			.default('pending')
			.$type<WorkflowExecutionStatus>(),
		/** Initial input to the workflow */
		input: text('input', { mode: 'json' }).$type<{
			message?: string
			data?: Record<string, unknown>
		}>(),
		/** Final output from the workflow */
		output: text('output', { mode: 'json' }).$type<{
			message?: string
			data?: Record<string, unknown>
		}>(),
		triggeredBy: text('triggeredBy').references(() => users.id),
		startedAt: integer('startedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		completedAt: integer('completedAt', { mode: 'timestamp' }),
		durationMs: integer('durationMs'),
		error: text('error'),
	},
	(table) => [
		index('workflow_exec_workflow_idx').on(table.workflowId),
		index('workflow_exec_workspace_idx').on(table.workspaceId),
		index('workflow_exec_status_idx').on(table.status),
		index('workflow_exec_started_at_idx').on(table.startedAt),
	],
)

/**
 * Workflow step executions track individual node executions within a workflow run.
 */
export const workflowStepExecutions = sqliteTable(
	'workflow_step_executions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		executionId: text('executionId')
			.notNull()
			.references(() => workflowExecutions.id, { onDelete: 'cascade' }),
		nodeId: text('nodeId')
			.notNull()
			.references(() => workflowNodes.id, { onDelete: 'cascade' }),
		agentId: text('agentId').references(() => agents.id, { onDelete: 'set null' }),
		status: text('status', { enum: WORKFLOW_STEP_STATUSES })
			.notNull()
			.default('pending')
			.$type<WorkflowStepStatus>(),
		input: text('input', { mode: 'json' }).$type<Record<string, unknown>>(),
		output: text('output', { mode: 'json' }).$type<Record<string, unknown>>(),
		startedAt: integer('startedAt', { mode: 'timestamp' }),
		completedAt: integer('completedAt', { mode: 'timestamp' }),
		durationMs: integer('durationMs'),
		error: text('error'),
	},
	(table) => [
		index('step_exec_execution_idx').on(table.executionId),
		index('step_exec_node_idx').on(table.nodeId),
		index('step_exec_status_idx').on(table.status),
	],
)
