/**
 * oRPC Tools Router
 *
 * Handles all tool-related operations with full type safety.
 */

import { getErrorMessage } from '@hare/checks'
import { config } from '@hare/config'
import { tools } from '@hare/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
	CreateToolSchema,
	IdParamSchema,
	SuccessSchema,
	ToolConfigSchema,
	ToolSchema,
	ToolTypeSchema,
	UpdateToolSchema,
} from '../../schemas'
import {
	executeHttpTool,
	HttpToolConfigSchema,
	type InputSchema,
	isUrlSafe,
} from '../../services/custom-tool-executor'
import { logAudit } from '../audit'
import { notFound, requireAdmin, requireWrite, serverError, type WorkspaceContext } from '../base'

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

async function findTool(opts: { id: string; workspaceId: string; db: WorkspaceContext['db'] }) {
	const { id, workspaceId, db } = opts
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

		const tool = await findTool({ id: input.id, workspaceId, db })
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

		// Log audit event for tool creation
		await logAudit({
			context,
			action: config.enums.auditAction.TOOL_CREATE,
			resourceType: 'tool',
			resourceId: tool.id,
			details: {
				name: tool.name,
				type: tool.type,
			},
		})

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

		const existing = await findTool({ id, workspaceId, db })
		if (!existing) notFound('Tool not found')

		const updateData: Partial<typeof tools.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.type !== undefined && { type: data.type }),
			...(data.config !== undefined && {
				config: data.config as (typeof tools.$inferInsert)['config'],
			}),
			...(data.inputSchema !== undefined && {
				inputSchema: data.inputSchema as (typeof tools.$inferInsert)['inputSchema'],
			}),
		}

		const [tool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning()

		if (!tool) serverError('Failed to update tool')

		// Log audit event for tool update
		await logAudit({
			context,
			action: config.enums.auditAction.TOOL_UPDATE,
			resourceType: 'tool',
			resourceId: id,
			details: {
				name: tool.name,
				updatedFields: Object.keys(data).filter(
					(key) => data[key as keyof typeof data] !== undefined,
				),
			},
		})

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

		// Log audit event for tool deletion
		const deletedTool = result[0]
		await logAudit({
			context,
			action: config.enums.auditAction.TOOL_DELETE,
			resourceType: 'tool',
			resourceId: input.id,
			details: {
				name: deletedTool?.name,
			},
		})

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
 *
 * Allows testing a tool configuration before creating/updating a tool.
 * Executes in an isolated context for safety.
 */
export const test = requireWrite
	.route({ method: 'POST', path: '/tools/test' })
	.input(TestToolInputSchema)
	.output(TestToolResultSchema)
	.handler(async ({ input }) => {
		const startTime = Date.now()
		const testInput = input.testInput ?? {}

		try {
			let result: { success: boolean; data?: unknown; error?: string }

			switch (input.type) {
				case 'http': {
					// Validate and parse HTTP config
					const configParsed = HttpToolConfigSchema.safeParse(input.config)
					if (!configParsed.success) {
						return {
							success: false,
							error: `Invalid HTTP tool configuration: ${configParsed.error.message}`,
							duration: Date.now() - startTime,
						}
					}

					// Check URL safety
					const urlSafety = isUrlSafe(configParsed.data.url)
					if (!urlSafety.safe) {
						return {
							success: false,
							error: urlSafety.reason,
							duration: Date.now() - startTime,
						}
					}

					// Execute HTTP tool
					const httpResult = await executeHttpTool({
						config: configParsed.data,
						input: testInput,
					})

					result = {
						success: httpResult.success,
						data: httpResult.data,
						error: httpResult.error,
					}
					break
				}

				// For other tool types, validate configuration structure
				default: {
					result = {
						success: true,
						data: {
							message: 'Tool configuration is valid',
							type: input.type,
							note: `Tool type '${input.type}' requires specific runtime environment for full execution`,
						},
					}
				}
			}

			return {
				success: result.success,
				result: result.data,
				error: result.error,
				duration: Date.now() - startTime,
			}
		} catch (error) {
			return {
				success: false,
				error: getErrorMessage(error),
				duration: Date.now() - startTime,
			}
		}
	})

/**
 * Test an existing tool
 *
 * Executes a tool in an isolated context for testing purposes.
 * Test executions are logged but don't count toward usage metrics.
 */
export const testExisting = requireWrite
	.route({ method: 'POST', path: '/tools/{id}/test' })
	.input(IdParamSchema.extend({ testInput: z.record(z.string(), z.unknown()).optional() }))
	.output(TestToolResultSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context
		const startTime = Date.now()

		const tool = await findTool({ id: input.id, workspaceId, db })
		if (!tool) notFound('Tool not found')

		const testInput = input.testInput ?? {}

		try {
			let result: { success: boolean; data?: unknown; error?: string }

			// Execute tool based on type
			switch (tool.type) {
				case 'http': {
					// Validate and parse HTTP config
					const configParsed = HttpToolConfigSchema.safeParse(tool.config)
					if (!configParsed.success) {
						return {
							success: false,
							error: `Invalid HTTP tool configuration: ${configParsed.error.message}`,
							duration: Date.now() - startTime,
						}
					}

					// Check URL safety
					const urlSafety = isUrlSafe(configParsed.data.url)
					if (!urlSafety.safe) {
						return {
							success: false,
							error: urlSafety.reason,
							duration: Date.now() - startTime,
						}
					}

					// Execute HTTP tool
					const httpResult = await executeHttpTool({
						config: configParsed.data,
						input: testInput,
						inputSchema: tool.inputSchema as InputSchema | undefined,
					})

					result = {
						success: httpResult.success,
						data: httpResult.data,
						error: httpResult.error,
					}
					break
				}

				// For other tool types, return a validation success message
				// since they may require specific runtime environments
				default: {
					// Validate that the input matches the tool's input schema if defined
					if (tool.inputSchema) {
						const schema = tool.inputSchema as InputSchema
						if (schema.required) {
							for (const field of schema.required) {
								if (!(field in testInput)) {
									return {
										success: false,
										error: `Missing required input field: ${field}`,
										duration: Date.now() - startTime,
									}
								}
							}
						}
					}

					result = {
						success: true,
						data: {
							message: `Tool '${tool.name}' configuration validated successfully`,
							type: tool.type,
							note: `Tool type '${tool.type}' requires specific runtime environment for full execution`,
						},
					}
				}
			}

			// Log test execution (marked as test - doesn't count toward usage)
			logAudit({
				context,
				action: config.enums.auditAction.TOOL_TEST,
				resourceType: 'tool',
				resourceId: tool.id,
				details: {
					name: tool.name,
					type: tool.type,
					success: result.success,
					isTest: true, // Flag to indicate this is a test execution
				},
			})

			return {
				success: result.success,
				result: result.data,
				error: result.error,
				duration: Date.now() - startTime,
			}
		} catch (error) {
			// Log failed test execution
			logAudit({
				context,
				action: config.enums.auditAction.TOOL_TEST,
				resourceType: 'tool',
				resourceId: tool.id,
				details: {
					name: tool.name,
					type: tool.type,
					success: false,
					isTest: true,
					error: getErrorMessage(error),
				},
			})

			return {
				success: false,
				error: getErrorMessage(error),
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
