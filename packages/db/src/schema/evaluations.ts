import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../id'
import { agents } from './agents'
import { users } from './auth'
import { workspaces } from './workspaces'

/**
 * Agent Evaluation Framework - test cases, runs, and results.
 * Enables systematic testing and quality scoring of agent responses.
 */

export const EVALUATION_TYPES = ['exact_match', 'contains', 'regex', 'llm_judge'] as const
export type EvaluationType = (typeof EVALUATION_TYPES)[number]

export const TEST_RUN_STATUSES = ['pending', 'running', 'completed', 'failed'] as const
export type TestRunStatus = (typeof TEST_RUN_STATUSES)[number]

export const TEST_RESULT_STATUSES = ['passed', 'failed', 'error'] as const
export type TestResultStatus = (typeof TEST_RESULT_STATUSES)[number]

/**
 * Test cases define input/expected output pairs for an agent.
 */
export const agentTestCases = sqliteTable(
	'agent_test_cases',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** The user message to send to the agent */
		input: text('input').notNull(),
		/** Expected output or evaluation criteria */
		expectedOutput: text('expectedOutput').notNull(),
		/** How to evaluate the response */
		evaluationType: text('evaluationType', { enum: EVALUATION_TYPES })
			.notNull()
			.default('contains')
			.$type<EvaluationType>(),
		/** Tags for organizing test cases */
		tags: text('tags', { mode: 'json' }).$type<string[]>(),
		enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
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
		index('test_cases_agent_idx').on(table.agentId),
		index('test_cases_workspace_idx').on(table.workspaceId),
	],
)

/**
 * Test runs represent a batch execution of test cases.
 */
export const agentTestRuns = sqliteTable(
	'agent_test_runs',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		agentId: text('agentId')
			.notNull()
			.references(() => agents.id, { onDelete: 'cascade' }),
		workspaceId: text('workspaceId')
			.notNull()
			.references(() => workspaces.id, { onDelete: 'cascade' }),
		status: text('status', { enum: TEST_RUN_STATUSES })
			.notNull()
			.default('pending')
			.$type<TestRunStatus>(),
		totalCases: integer('totalCases').notNull().default(0),
		passedCases: integer('passedCases').notNull().default(0),
		failedCases: integer('failedCases').notNull().default(0),
		errorCases: integer('errorCases').notNull().default(0),
		/** Overall score as percentage (0-100) */
		score: integer('score'),
		triggeredBy: text('triggeredBy')
			.notNull()
			.references(() => users.id),
		startedAt: integer('startedAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		completedAt: integer('completedAt', { mode: 'timestamp' }),
	},
	(table) => [
		index('test_runs_agent_idx').on(table.agentId),
		index('test_runs_workspace_idx').on(table.workspaceId),
		index('test_runs_status_idx').on(table.status),
		index('test_runs_started_at_idx').on(table.startedAt),
	],
)

/**
 * Individual test results within a test run.
 */
export const agentTestResults = sqliteTable(
	'agent_test_results',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		testRunId: text('testRunId')
			.notNull()
			.references(() => agentTestRuns.id, { onDelete: 'cascade' }),
		testCaseId: text('testCaseId')
			.notNull()
			.references(() => agentTestCases.id, { onDelete: 'cascade' }),
		status: text('status', { enum: TEST_RESULT_STATUSES }).notNull().$type<TestResultStatus>(),
		/** The actual agent response */
		actualOutput: text('actualOutput'),
		/** Score for this individual test (0-100) */
		score: integer('score'),
		/** Evaluation details (match info, LLM judge reasoning, etc.) */
		evaluationDetails: text('evaluationDetails', { mode: 'json' }).$type<{
			matchType?: string
			matchedText?: string
			reasoning?: string
			confidence?: number
		}>(),
		durationMs: integer('durationMs'),
		error: text('error'),
		createdAt: integer('createdAt', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index('test_results_run_idx').on(table.testRunId),
		index('test_results_case_idx').on(table.testCaseId),
		index('test_results_status_idx').on(table.status),
	],
)
