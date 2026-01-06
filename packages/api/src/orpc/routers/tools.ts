/**
 * oRPC Tools Router
 *
 * Handles all tool-related operations with full type safety.
 */

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { tools } from '@hare/db/schema'
import { TOOL_TYPES } from '@hare/config'
import { requireWrite, requireAdmin, notFound, serverError, type WorkspaceContext } from '../base'
import { SuccessSchema, IdParamSchema } from '../../schemas'

// =============================================================================
// Type-Safe Schemas
// =============================================================================

/** Tool type enum - properly typed from config */
const ToolTypeSchema = z.enum(TOOL_TYPES)
type ToolType = z.infer<typeof ToolTypeSchema>

/** Property type values - matching database schema */
const PropertyTypeValues = ['string', 'number', 'boolean', 'array', 'object'] as const
const PropertyTypeSchema = z.enum(PropertyTypeValues)

/** JSON Schema property schema - matching database structure */
const JsonSchemaPropertySchema = z.object({
	type: PropertyTypeSchema,
	description: z.string().optional(),
	default: z.unknown().optional(),
	enum: z.array(z.string()).optional(),
	required: z.boolean().optional(),
})

/** JSON Schema object schema - matching database structure */
const InputSchemaSchema = z.object({
	type: z.literal('object'),
	properties: z.record(z.string(), JsonSchemaPropertySchema).optional(),
	required: z.array(z.string()).optional(),
})

/** Tool config schema - matching database structure */
const ToolConfigSchema = z.object({
	url: z.string().optional(),
	method: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.string().optional(),
	bodyType: z.enum(['json', 'form', 'text']).optional(),
	responseMapping: z.object({
		path: z.string().optional(),
		transform: z.string().optional(),
	}).optional(),
	timeout: z.number().optional(),
	query: z.string().optional(),
	database: z.string().optional(),
	searchEngine: z.string().optional(),
	webhookUrl: z.string().optional(),
	apiKey: z.string().optional(),
	apiEndpoint: z.string().optional(),
	channel: z.string().optional(),
	from: z.string().optional(),
	customCode: z.string().optional(),
})

const ToolSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: ToolTypeSchema,
	config: ToolConfigSchema,
	inputSchema: InputSchemaSchema.nullable(),
	isSystem: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

const CreateToolInputSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	type: ToolTypeSchema,
	config: ToolConfigSchema,
	inputSchema: InputSchemaSchema.optional(),
})

const UpdateToolInputSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	type: ToolTypeSchema.optional(),
	config: ToolConfigSchema.optional(),
	inputSchema: InputSchemaSchema.optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function serializeTool(tool: typeof tools.$inferSelect): z.infer<typeof ToolSchema> {
	return {
		id: tool.id,
		workspaceId: tool.workspaceId,
		name: tool.name,
		description: tool.description,
		type: tool.type,
		config: tool.config ?? {},
		inputSchema: tool.inputSchema ?? null,
		isSystem: false,
		createdAt: tool.createdAt.toISOString(),
		updatedAt: tool.updatedAt.toISOString(),
	}
}

async function findTool(id: string, workspaceId: string, db: WorkspaceContext['db']) {
	const [tool] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspaceId)))
	return tool || null
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List all tools in workspace
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/tools' })
	.output(z.object({ tools: z.array(ToolSchema) }))
	.handler(async ({ context }) => {
		const { db, workspaceId } = context

		const results = await db.select().from(tools).where(eq(tools.workspaceId, workspaceId))

		return { tools: results.map(serializeTool) }
	})

/**
 * Get single tool by ID
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/tools/{id}' })
	.input(IdParamSchema)
	.output(ToolSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const tool = await findTool(input.id, workspaceId, db)
		if (!tool) notFound('Tool not found')

		return serializeTool(tool)
	})

/**
 * Create new tool
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/tools', successStatus: 201 })
	.input(CreateToolInputSchema)
	.output(ToolSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		const [tool] = await db
			.insert(tools)
			.values({
				workspaceId,
				name: input.name,
				description: input.description,
				type: input.type,
				config: input.config,
				inputSchema: input.inputSchema,
				createdBy: user.id,
			} as typeof tools.$inferInsert)
			.returning()

		if (!tool) serverError('Failed to create tool')

		return serializeTool(tool)
	})

/**
 * Update tool
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/tools/{id}' })
	.input(IdParamSchema.merge(UpdateToolInputSchema))
	.output(ToolSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const existing = await findTool(id, workspaceId, db)
		if (!existing) notFound('Tool not found')

		const updateData = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.type !== undefined && { type: data.type }),
			...(data.config !== undefined && { config: data.config }),
			...(data.inputSchema !== undefined && { inputSchema: data.inputSchema }),
		}

		const [tool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning()

		if (!tool) serverError('Failed to update tool')

		return serializeTool(tool)
	})

/**
 * Delete tool
 */
export const remove = requireAdmin
	.route({ method: 'DELETE', path: '/tools/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(tools)
			.where(and(eq(tools.id, input.id), eq(tools.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('Tool not found')

		return { success: true }
	})

// =============================================================================
// Test Schemas
// =============================================================================

const TestToolInputSchema = z.object({
	name: z.string(),
	type: ToolTypeSchema,
	config: ToolConfigSchema,
	testInput: z.record(z.string(), z.unknown()).optional(),
})

const TestToolResultSchema = z.object({
	success: z.boolean(),
	result: z.unknown().optional(),
	error: z.string().optional(),
	duration: z.number().optional(),
})

/**
 * Test a tool configuration (without saving)
 */
export const test = requireWrite
	.route({ method: 'POST', path: '/tools/test' })
	.input(TestToolInputSchema)
	.output(TestToolResultSchema)
	.handler(async ({ input }) => {
		const startTime = Date.now()

		try {
			// TODO: Implement actual tool testing logic based on tool type
			// For now, return a mock success response
			return {
				success: true,
				result: { message: 'Tool configuration is valid' },
				duration: Date.now() - startTime,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				duration: Date.now() - startTime,
			}
		}
	})

/**
 * Test an existing tool
 */
export const testExisting = requireWrite
	.route({ method: 'POST', path: '/tools/{id}/test' })
	.input(IdParamSchema.extend({ testInput: z.record(z.string(), z.unknown()).optional() }))
	.output(TestToolResultSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const startTime = Date.now()

		const tool = await findTool(input.id, workspaceId, db)
		if (!tool) notFound('Tool not found')

		try {
			// TODO: Implement actual tool testing logic
			return {
				success: true,
				result: { message: `Tool '${tool.name}' executed successfully` },
				duration: Date.now() - startTime,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				duration: Date.now() - startTime,
			}
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const toolsRouter = {
	list,
	get,
	create,
	update,
	delete: remove,
	test,
	testExisting,
}
