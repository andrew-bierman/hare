import { z } from '@hono/zod-openapi'

/**
 * Trigger schemas for event-driven agent activation.
 */

export const TriggerTypeSchema = z
	.enum(['webhook', 'email', 'cron', 'manual'])
	.openapi({ example: 'webhook' })

export const TriggerStatusSchema = z
	.enum(['active', 'inactive', 'error'])
	.openapi({ example: 'active' })

export const TriggerExecutionStatusSchema = z
	.enum(['pending', 'running', 'completed', 'failed'])
	.openapi({ example: 'completed' })

export const TriggerConfigSchema = z.record(z.string(), z.unknown()).openapi('TriggerConfig')

export const CreateTriggerSchema = z
	.object({
		agentId: z.string().openapi({ example: 'agent_abc123' }),
		type: TriggerTypeSchema,
		name: z
			.string()
			.min(1, 'Name is required')
			.max(100, 'Name must be at most 100 characters')
			.trim(),
		description: z.string().max(500).optional(),
		config: TriggerConfigSchema.optional(),
		enabled: z.boolean().optional().default(true),
	})
	.openapi('CreateTrigger')

export const UpdateTriggerSchema = z
	.object({
		name: z.string().min(1).max(100).trim().optional(),
		description: z.string().max(500).optional(),
		config: TriggerConfigSchema.optional(),
		enabled: z.boolean().optional(),
		status: TriggerStatusSchema.optional(),
	})
	.openapi('UpdateTrigger')

export const TriggerSchema = z
	.object({
		id: z.string(),
		agentId: z.string(),
		type: TriggerTypeSchema,
		name: z.string(),
		description: z.string().nullable(),
		config: TriggerConfigSchema.nullable(),
		enabled: z.boolean(),
		status: TriggerStatusSchema,
		webhookPath: z.string().nullable(),
		webhookUrl: z.string().nullable(),
		lastTriggeredAt: z.string().datetime().nullable(),
		triggerCount: z.number().int(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi('Trigger')

export const TriggerExecutionSchema = z
	.object({
		id: z.string(),
		triggerId: z.string(),
		agentId: z.string(),
		status: TriggerExecutionStatusSchema,
		input: z.record(z.string(), z.unknown()).nullable(),
		output: z.record(z.string(), z.unknown()).nullable(),
		startedAt: z.string().datetime(),
		completedAt: z.string().datetime().nullable(),
		durationMs: z.number().int().nullable(),
		error: z.string().nullable(),
	})
	.openapi('TriggerExecution')
