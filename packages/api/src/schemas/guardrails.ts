import { z } from 'zod'

/**
 * Guardrails schemas for agent safety and content policies.
 */

export const GuardrailTypeSchema = z.enum([
	'content_filter',
	'topic_restriction',
	'pii_protection',
	'prompt_injection',
	'output_validation',
	'word_filter',
])

export const GuardrailActionSchema = z.enum(['block', 'warn', 'redact', 'log'])

export const GuardrailConfigSchema = z.object({
	// content_filter
	categories: z.array(z.string()).optional(),
	threshold: z.number().min(0).max(1).optional(),
	// topic_restriction
	allowedTopics: z.array(z.string()).optional(),
	blockedTopics: z.array(z.string()).optional(),
	// pii_protection
	piiTypes: z.array(z.string()).optional(),
	redactionStyle: z.enum(['mask', 'remove', 'placeholder']).optional(),
	// prompt_injection
	detectionSensitivity: z.enum(['low', 'medium', 'high']).optional(),
	// output_validation
	maxLength: z.number().int().positive().optional(),
	requiredFormat: z.string().optional(),
	bannedPhrases: z.array(z.string()).optional(),
	// word_filter
	blockedWords: z.array(z.string()).optional(),
	blockedPatterns: z.array(z.string()).optional(),
})

export const GuardrailSchema = z.object({
	id: z.string(),
	agentId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: GuardrailTypeSchema,
	action: GuardrailActionSchema,
	enabled: z.boolean(),
	config: GuardrailConfigSchema.nullable(),
	message: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export const CreateGuardrailSchema = z.object({
	agentId: z.string(),
	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be at most 100 characters')
		.trim(),
	description: z.string().max(500).optional(),
	type: GuardrailTypeSchema,
	action: GuardrailActionSchema.optional().default('block'),
	enabled: z.boolean().optional().default(true),
	config: GuardrailConfigSchema.optional(),
	message: z
		.string()
		.max(500, 'Message must be at most 500 characters')
		.optional()
		.describe('Custom message shown when guardrail triggers'),
})

export const UpdateGuardrailSchema = z.object({
	name: z.string().min(1).max(100).trim().optional(),
	description: z.string().max(500).optional(),
	action: GuardrailActionSchema.optional(),
	enabled: z.boolean().optional(),
	config: GuardrailConfigSchema.optional(),
	message: z.string().max(500).optional(),
})

export const GuardrailViolationSchema = z.object({
	id: z.string(),
	guardrailId: z.string(),
	agentId: z.string(),
	direction: z.enum(['input', 'output']),
	actionTaken: GuardrailActionSchema,
	triggerContent: z.string().nullable(),
	details: z
		.object({
			category: z.string().optional(),
			confidence: z.number().optional(),
			matchedPattern: z.string().optional(),
			piiType: z.string().optional(),
		})
		.nullable(),
	createdAt: z.string().datetime(),
})
