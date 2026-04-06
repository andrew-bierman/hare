/**
 * oRPC Evaluations Router
 *
 * Handles agent test case CRUD, test run creation, and results.
 */

import { agents, agentTestCases, agentTestResults, agentTestRuns } from '@hare/db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
	CreateTestCaseSchema,
	IdParamSchema,
	SuccessSchema,
	TestCaseSchema,
	TestResultSchema,
	TestRunSchema,
	UpdateTestCaseSchema,
} from '../../schemas'
import { notFound, requireWrite, serverError } from '../base'

// =============================================================================
// Helpers
// =============================================================================

function serializeTestCase(tc: typeof agentTestCases.$inferSelect): z.infer<typeof TestCaseSchema> {
	return {
		id: tc.id,
		agentId: tc.agentId,
		name: tc.name,
		input: tc.input,
		expectedOutput: tc.expectedOutput,
		evaluationType: tc.evaluationType as z.infer<typeof TestCaseSchema>['evaluationType'],
		tags: tc.tags,
		enabled: tc.enabled,
		createdAt: tc.createdAt.toISOString(),
		updatedAt: tc.updatedAt.toISOString(),
	}
}

function serializeTestRun(tr: typeof agentTestRuns.$inferSelect): z.infer<typeof TestRunSchema> {
	return {
		id: tr.id,
		agentId: tr.agentId,
		status: tr.status as z.infer<typeof TestRunSchema>['status'],
		totalCases: tr.totalCases,
		passedCases: tr.passedCases,
		failedCases: tr.failedCases,
		errorCases: tr.errorCases,
		score: tr.score,
		triggeredBy: tr.triggeredBy,
		startedAt: tr.startedAt.toISOString(),
		completedAt: tr.completedAt?.toISOString() ?? null,
	}
}

function serializeTestResult(
	tr: typeof agentTestResults.$inferSelect,
	testCaseName?: string,
): z.infer<typeof TestResultSchema> {
	return {
		id: tr.id,
		testRunId: tr.testRunId,
		testCaseId: tr.testCaseId,
		testCaseName,
		status: tr.status as z.infer<typeof TestResultSchema>['status'],
		actualOutput: tr.actualOutput,
		score: tr.score,
		evaluationDetails: tr.evaluationDetails as z.infer<
			typeof TestResultSchema
		>['evaluationDetails'],
		durationMs: tr.durationMs,
		error: tr.error,
		createdAt: tr.createdAt.toISOString(),
	}
}

// =============================================================================
// Test Case Procedures
// =============================================================================

/**
 * List test cases for an agent
 */
export const listTestCases = requireWrite
	.route({ method: 'GET', path: '/evaluations/test-cases' })
	.input(z.object({ agentId: z.string() }))
	.output(z.object({ testCases: z.array(TestCaseSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const results = await db
			.select()
			.from(agentTestCases)
			.where(
				and(eq(agentTestCases.agentId, input.agentId), eq(agentTestCases.workspaceId, workspaceId)),
			)
			.orderBy(desc(agentTestCases.createdAt))

		return { testCases: results.map(serializeTestCase) }
	})

/**
 * Create a test case
 */
export const createTestCase = requireWrite
	.route({ method: 'POST', path: '/evaluations/test-cases', successStatus: 201 })
	.input(CreateTestCaseSchema)
	.output(TestCaseSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Verify agent belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Agent not found')

		const [testCase] = await db
			.insert(agentTestCases)
			.values({
				agentId: input.agentId,
				workspaceId,
				name: input.name,
				input: input.input,
				expectedOutput: input.expectedOutput,
				evaluationType: input.evaluationType ?? 'contains',
				tags: input.tags,
				enabled: input.enabled ?? true,
				createdBy: user.id,
			})
			.returning()

		if (!testCase) serverError('Failed to create test case')

		return serializeTestCase(testCase)
	})

/**
 * Update a test case
 */
export const updateTestCase = requireWrite
	.route({ method: 'PATCH', path: '/evaluations/test-cases/{id}' })
	.input(IdParamSchema.merge(UpdateTestCaseSchema))
	.output(TestCaseSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const updateData: Partial<typeof agentTestCases.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.input !== undefined && { input: data.input }),
			...(data.expectedOutput !== undefined && { expectedOutput: data.expectedOutput }),
			...(data.evaluationType !== undefined && { evaluationType: data.evaluationType }),
			...(data.tags !== undefined && { tags: data.tags }),
			...(data.enabled !== undefined && { enabled: data.enabled }),
		}

		const [testCase] = await db
			.update(agentTestCases)
			.set(updateData)
			.where(and(eq(agentTestCases.id, id), eq(agentTestCases.workspaceId, workspaceId)))
			.returning()

		if (!testCase) notFound('Test case not found')

		return serializeTestCase(testCase)
	})

/**
 * Delete a test case
 */
export const deleteTestCase = requireWrite
	.route({ method: 'DELETE', path: '/evaluations/test-cases/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(agentTestCases)
			.where(and(eq(agentTestCases.id, input.id), eq(agentTestCases.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('Test case not found')

		return { success: true }
	})

// =============================================================================
// Test Run Procedures
// =============================================================================

/**
 * Create a test run (triggers batch evaluation)
 */
export const createTestRun = requireWrite
	.route({ method: 'POST', path: '/evaluations/test-runs', successStatus: 201 })
	.input(z.object({ agentId: z.string() }))
	.output(TestRunSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Verify agent belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Agent not found')

		// Count enabled test cases
		const [countResult] = await db
			.select({ total: count() })
			.from(agentTestCases)
			.where(
				and(
					eq(agentTestCases.agentId, input.agentId),
					eq(agentTestCases.workspaceId, workspaceId),
					eq(agentTestCases.enabled, true),
				),
			)

		const totalCases = countResult?.total ?? 0
		if (totalCases === 0) serverError('No enabled test cases found for this agent')

		const [testRun] = await db
			.insert(agentTestRuns)
			.values({
				agentId: input.agentId,
				workspaceId,
				status: 'pending',
				totalCases,
				triggeredBy: user.id,
			})
			.returning()

		if (!testRun) serverError('Failed to create test run')

		// TODO: Trigger async evaluation pipeline
		// 1. Fetch all enabled test cases
		// 2. For each test case, send input to agent
		// 3. Evaluate response against expected output
		// 4. Store results in agent_test_results
		// 5. Update test run with final counts and score

		return serializeTestRun(testRun)
	})

/**
 * List test runs for an agent
 */
export const listTestRuns = requireWrite
	.route({ method: 'GET', path: '/evaluations/test-runs' })
	.input(
		z.object({
			agentId: z.string(),
			limit: z.coerce.number().int().min(1).max(50).optional().default(20),
			offset: z.coerce.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			testRuns: z.array(TestRunSchema),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [countResult] = await db
			.select({ total: count() })
			.from(agentTestRuns)
			.where(
				and(eq(agentTestRuns.agentId, input.agentId), eq(agentTestRuns.workspaceId, workspaceId)),
			)

		const results = await db
			.select()
			.from(agentTestRuns)
			.where(
				and(eq(agentTestRuns.agentId, input.agentId), eq(agentTestRuns.workspaceId, workspaceId)),
			)
			.orderBy(desc(agentTestRuns.startedAt))
			.limit(input.limit)
			.offset(input.offset)

		return {
			testRuns: results.map(serializeTestRun),
			total: countResult?.total ?? 0,
		}
	})

/**
 * Get a test run with its results
 */
export const getTestRun = requireWrite
	.route({ method: 'GET', path: '/evaluations/test-runs/{id}' })
	.input(IdParamSchema)
	.output(
		z.object({
			testRun: TestRunSchema,
			results: z.array(TestResultSchema),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [testRun] = await db
			.select()
			.from(agentTestRuns)
			.where(and(eq(agentTestRuns.id, input.id), eq(agentTestRuns.workspaceId, workspaceId)))

		if (!testRun) notFound('Test run not found')

		const results = await db
			.select()
			.from(agentTestResults)
			.where(eq(agentTestResults.testRunId, input.id))

		// Get test case names for results
		const caseIds = results.map((r) => r.testCaseId)
		let caseNameMap = new Map<string, string>()
		if (caseIds.length > 0) {
			const { inArray } = await import('drizzle-orm')
			const cases = await db
				.select({ id: agentTestCases.id, name: agentTestCases.name })
				.from(agentTestCases)
				.where(inArray(agentTestCases.id, caseIds))
			caseNameMap = new Map(cases.map((c) => [c.id, c.name]))
		}

		return {
			testRun: serializeTestRun(testRun),
			results: results.map((r) => serializeTestResult(r, caseNameMap.get(r.testCaseId))),
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const evaluationsRouter = {
	listTestCases,
	createTestCase,
	updateTestCase,
	deleteTestCase,
	createTestRun,
	listTestRuns,
	getTestRun,
}
