import { TOOL_TYPES } from '@hare/config'
import { z } from 'zod'
import { JsonSchemaSchema, JsonValueSchema } from './common'

/**
 * Tool configuration schema.
 */
export const ToolConfigSchema = z.record(z.string(), JsonValueSchema)

/**
 * All supported tool types.
 */
export const ToolTypeSchema = z.enum(TOOL_TYPES)

/**
 * Full tool schema for API responses.
 */
export const ToolSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: ToolTypeSchema,
	inputSchema: JsonSchemaSchema.nullable(),
	outputSchema: JsonSchemaSchema.optional(),
	config: ToolConfigSchema.optional(),
	code: z.string().optional(),
	isSystem: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

/**
 * Schema for creating a new tool.
 */
export const CreateToolSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	type: ToolTypeSchema,
	inputSchema: JsonSchemaSchema.optional(),
	config: ToolConfigSchema.optional(),
	code: z.string().optional(),
})

/**
 * Schema for updating a tool.
 */
export const UpdateToolSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	type: ToolTypeSchema.optional(),
	inputSchema: JsonSchemaSchema.optional(),
	config: ToolConfigSchema.optional(),
	code: z.string().optional(),
})
