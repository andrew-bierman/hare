/**
 * oRPC Tools Router
 *
 * Handles all tool-related operations with full type safety.
 */

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { tools } from '@hare/db/schema'
import { requireWrite, requireAdmin, notFound, serverError, type WorkspaceContext } from '../base'
import {
	SuccessSchema,
	IdParamSchema,
	ToolSchema,
	ToolTypeSchema,
	ToolConfigSchema,
	CreateToolSchema,
	UpdateToolSchema,
} from '../../schemas'

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
	.input(CreateToolSchema)
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
	.input(IdParamSchema.merge(UpdateToolSchema))
	.output(ToolSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const existing = await findTool(id, workspaceId, db)
		if (!existing) notFound('Tool not found')

		const updateData: Partial<typeof tools.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.type !== undefined && { type: data.type }),
			...(data.config !== undefined && { config: data.config as typeof tools.$inferInsert['config'] }),
			...(data.inputSchema !== undefined && { inputSchema: data.inputSchema as typeof tools.$inferInsert['inputSchema'] }),
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
 * Validate tool configuration based on type
 */
function validateToolConfig(
	type: string,
	config: Record<string, unknown>,
): { valid: boolean; error?: string } {
	switch (type) {
		case 'http':
		case 'webhook': {
			const url = config.url
			if (!url || typeof url !== 'string') {
				return { valid: false, error: 'HTTP/Webhook tools require a valid URL' }
			}
			try {
				new URL(url)
			} catch {
				return { valid: false, error: `Invalid URL format: ${url}` }
			}
			return { valid: true }
		}
		case 'sql': {
			const query = config.query
			if (!query || typeof query !== 'string') {
				return { valid: false, error: 'SQL tools require a query string' }
			}
			return { valid: true }
		}
		case 'code': {
			const customCode = config.customCode
			if (!customCode || typeof customCode !== 'string') {
				return { valid: false, error: 'Code tools require customCode' }
			}
			return { valid: true }
		}
		default:
			// For other types, just ensure config is provided
			return { valid: true }
	}
}

/**
 * Test a tool configuration (without saving)
 */
export const test = requireWrite
	.route({ method: 'POST', path: '/tools/test' })
	.input(TestToolInputSchema)
	.output(TestToolResultSchema)
	.handler(async () => {
		const startTime = Date.now()

		try {
			// Validate tool configuration based on type
			const validation = validateToolConfig(input.type, input.config)

			if (!validation.valid) {
				return {
					success: false,
					error: validation.error,
					duration: Date.now() - startTime,
				}
			}

			return {
				success: true,
				result: { message: 'Tool configuration is valid', type: input.type },
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
			// Validate the existing tool's configuration
			const validation = validateToolConfig(tool.type, tool.config ?? {})

			if (!validation.valid) {
				return {
					success: false,
					error: validation.error,
					duration: Date.now() - startTime,
				}
			}

			return {
				success: true,
				result: {
					message: `Tool '${tool.name}' configuration is valid`,
					type: tool.type,
					name: tool.name,
				},
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
