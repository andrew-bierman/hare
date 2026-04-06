/**
 * Tool Routes
 *
 * CRUD operations, testing, and validation for custom tools.
 */

import { getErrorMessage } from '@hare/checks'
import { config } from '@hare/config'
import type { Database } from '@hare/db'
import { tools } from '@hare/db/schema'
import { and, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import {
	CreateToolSchema,
	ToolConfigSchema,
	type ToolSchema,
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
import { type AuthUserContext, adminPlugin, writePlugin } from '../context'

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

async function findTool(options: { id: string; workspaceId: string; db: Database }) {
	const { id, workspaceId, db } = options
	const [tool] = await db
		.select()
		.from(tools)
		.where(and(eq(tools.id, id), eq(tools.workspaceId, workspaceId)))
	return tool || null
}

function auditCtx(ctx: {
	db: Database
	workspaceId: string
	user: AuthUserContext
	request: Request
}) {
	return {
		db: ctx.db,
		workspaceId: ctx.workspaceId,
		userId: ctx.user.id,
		headers: ctx.request.headers,
	}
}

// =============================================================================
// Test Schemas
// =============================================================================

const TestToolInputSchema = z.object({
	name: z.string(),
	type: ToolTypeSchema,
	config: ToolConfigSchema,
	testInput: z.record(z.string(), z.unknown()).optional(),
})

const TestExistingToolInputSchema = z.object({
	testInput: z.record(z.string(), z.unknown()).optional(),
})

// =============================================================================
// Routes
// =============================================================================

export const toolRoutes = new Elysia({ prefix: '/tools', name: 'tool-routes' })
	// --- Write-access routes ---
	.use(writePlugin)

	// List tools
	.get(
		'/',
		async ({ db, workspaceId }) => {
			const results = await db.select().from(tools).where(eq(tools.workspaceId, workspaceId))
			return { tools: results.map(serializeTool) }
		},
		{ writeAccess: true },
	)

	// Get tool
	.get(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const tool = await findTool({ id: params.id, workspaceId, db })
			if (!tool) return status(404, { error: 'Tool not found' })
			return serializeTool(tool)
		},
		{ writeAccess: true },
	)

	// Create tool
	.post(
		'/',
		async (ctx) => {
			const { db, workspaceId, user, body } = ctx
			const [tool] = await db
				.insert(tools)
				.values({
					workspaceId,
					name: body.name,
					description: body.description,
					type: body.type,
					config: body.config,
					inputSchema: body.inputSchema,
					createdBy: user.id,
				} as typeof tools.$inferInsert)
				.returning()

			if (!tool) throw new Error('Failed to create tool')

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.TOOL_CREATE,
				resourceType: 'tool',
				resourceId: tool.id,
				details: { name: tool.name, type: tool.type },
			})

			return serializeTool(tool)
		},
		{ writeAccess: true, body: CreateToolSchema },
	)

	// Update tool
	.patch(
		'/:id',
		async (ctx) => {
			const { db, workspaceId, params, body } = ctx
			const existing = await findTool({ id: params.id, workspaceId, db })
			if (!existing) return status(404, { error: 'Tool not found' })

			const updateData: Partial<typeof tools.$inferInsert> = {
				updatedAt: new Date(),
				...(body.name !== undefined && { name: body.name }),
				...(body.description !== undefined && { description: body.description }),
				...(body.type !== undefined && { type: body.type }),
				...(body.config !== undefined && {
					config: body.config as (typeof tools.$inferInsert)['config'],
				}),
				...(body.inputSchema !== undefined && {
					inputSchema: body.inputSchema as (typeof tools.$inferInsert)['inputSchema'],
				}),
			}

			const [tool] = await db
				.update(tools)
				.set(updateData)
				.where(eq(tools.id, params.id))
				.returning()
			if (!tool) throw new Error('Failed to update tool')

			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.TOOL_UPDATE,
				resourceType: 'tool',
				resourceId: params.id,
				details: {
					name: tool.name,
					updatedFields: Object.keys(body).filter(
						(key) => body[key as keyof typeof body] !== undefined,
					),
				},
			})

			return serializeTool(tool)
		},
		{ writeAccess: true, body: UpdateToolSchema },
	)

	// Test tool configuration (without saving)
	.post(
		'/test',
		async ({ body }) => {
			const startTime = Date.now()
			const testInput = body.testInput ?? {}

			try {
				let result: { success: boolean; data?: unknown; error?: string }

				switch (body.type) {
					case 'http': {
						const configParsed = HttpToolConfigSchema.safeParse(body.config)
						if (!configParsed.success) {
							return {
								success: false,
								error: `Invalid HTTP tool configuration: ${configParsed.error.message}`,
								duration: Date.now() - startTime,
							}
						}

						const urlSafety = isUrlSafe(configParsed.data.url)
						if (!urlSafety.safe) {
							return {
								success: false,
								error: urlSafety.reason,
								duration: Date.now() - startTime,
							}
						}

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

					default: {
						result = {
							success: true,
							data: {
								message: 'Tool configuration is valid',
								type: body.type,
								note: `Tool type '${body.type}' requires specific runtime environment for full execution`,
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
			} catch (err) {
				return {
					success: false,
					error: getErrorMessage(err),
					duration: Date.now() - startTime,
				}
			}
		},
		{ writeAccess: true, body: TestToolInputSchema },
	)

	// Test an existing tool
	.post(
		'/:id/test',
		async (ctx) => {
			const { db, workspaceId, params, body } = ctx
			const startTime = Date.now()

			const tool = await findTool({ id: params.id, workspaceId, db })
			if (!tool) return status(404, { error: 'Tool not found' })

			const testInput = body.testInput ?? {}

			try {
				let result: { success: boolean; data?: unknown; error?: string }

				switch (tool.type) {
					case 'http': {
						const configParsed = HttpToolConfigSchema.safeParse(tool.config)
						if (!configParsed.success) {
							return {
								success: false,
								error: `Invalid HTTP tool configuration: ${configParsed.error.message}`,
								duration: Date.now() - startTime,
							}
						}

						const urlSafety = isUrlSafe(configParsed.data.url)
						if (!urlSafety.safe) {
							return {
								success: false,
								error: urlSafety.reason,
								duration: Date.now() - startTime,
							}
						}

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

					default: {
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

				logAudit({
					...auditCtx(ctx),
					action: config.enums.auditAction.TOOL_TEST,
					resourceType: 'tool',
					resourceId: tool.id,
					details: {
						name: tool.name,
						type: tool.type,
						success: result.success,
						isTest: true,
					},
				})

				return {
					success: result.success,
					result: result.data,
					error: result.error,
					duration: Date.now() - startTime,
				}
			} catch (err) {
				logAudit({
					...auditCtx(ctx),
					action: config.enums.auditAction.TOOL_TEST,
					resourceType: 'tool',
					resourceId: tool.id,
					details: {
						name: tool.name,
						type: tool.type,
						success: false,
						isTest: true,
						error: getErrorMessage(err),
					},
				})

				return {
					success: false,
					error: getErrorMessage(err),
					duration: Date.now() - startTime,
				}
			}
		},
		{ writeAccess: true, body: TestExistingToolInputSchema },
	)

	// --- Admin-access routes ---
	.use(adminPlugin)

	// Delete tool
	.delete(
		'/:id',
		async (ctx) => {
			const { db, workspaceId, params } = ctx
			const result = await db
				.delete(tools)
				.where(and(eq(tools.id, params.id), eq(tools.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'Tool not found' })

			const deletedTool = result[0]
			await logAudit({
				...auditCtx(ctx),
				action: config.enums.auditAction.TOOL_DELETE,
				resourceType: 'tool',
				resourceId: params.id,
				details: { name: deletedTool?.name },
			})

			return { success: true }
		},
		{ adminAccess: true },
	)
