import { z } from '@hono/zod-openapi'

/**
 * Agent evaluation framework schemas.
 */

export const EvaluationTypeSchema = z
	.enum(['exact_match', 'contains', 'regex', 'llm_judge'])
	.openapi({ example: 'contains' })

export const TestRunStatusSchema = z
	.enum(['pending', 'running', 'completed', 'failed'])
	.openapi({ example: 'completed' })

export const TestResultStatusSchema = z
	.enum(['passed', 'failed', 'error'])
	.openapi({ example: 'passed' })

export const TestCaseSchema = z
	.object({
		id: z.string(),
		agentId: z.string(),
		name: z.string(),
		input: z.string(),
		expectedOutput: z.string(),
		evaluationType: EvaluationTypeSchema,
		tags: z.array(z.string()).nullable(),
		enabled: z.boolean(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi('TestCase')

export const CreateTestCaseSchema = z
	.object({
		agentId: z.string(),
		name: z.string().min(1).max(200).trim(),
		input: z.string().min(1).max(5000),
		expectedOutput: z.string().min(1).max(5000),
		evaluationType: EvaluationTypeSchema.optional().default('contains'),
		tags: z.array(z.string().max(50)).max(10).optional(),
		enabled: z.boolean().optional().default(true),
	})
	.openapi('CreateTestCase')

export const UpdateTestCaseSchema = z
	.object({
		name: z.string().min(1).max(200).trim().optional(),
		input: z.string().min(1).max(5000).optional(),
		expectedOutput: z.string().min(1).max(5000).optional(),
		evaluationType: EvaluationTypeSchema.optional(),
		tags: z.array(z.string().max(50)).max(10).optional(),
		enabled: z.boolean().optional(),
	})
	.openapi('UpdateTestCase')

export const TestRunSchema = z
	.object({
		id: z.string(),
		agentId: z.string(),
		status: TestRunStatusSchema,
		totalCases: z.number().int(),
		passedCases: z.number().int(),
		failedCases: z.number().int(),
		errorCases: z.number().int(),
		score: z.number().int().nullable(),
		triggeredBy: z.string(),
		startedAt: z.string().datetime(),
		completedAt: z.string().datetime().nullable(),
	})
	.openapi('TestRun')

export const TestResultSchema = z
	.object({
		id: z.string(),
		testRunId: z.string(),
		testCaseId: z.string(),
		testCaseName: z.string().optional(),
		status: TestResultStatusSchema,
		actualOutput: z.string().nullable(),
		score: z.number().int().nullable(),
		evaluationDetails: z
			.object({
				matchType: z.string().optional(),
				matchedText: z.string().optional(),
				reasoning: z.string().optional(),
				confidence: z.number().optional(),
			})
			.nullable(),
		durationMs: z.number().int().nullable(),
		error: z.string().nullable(),
		createdAt: z.string().datetime(),
	})
	.openapi('TestResult')
