/**
 * oRPC Guardrails Router
 *
 * Handles guardrail CRUD and violation tracking for agent safety.
 */

import { agents, guardrails, guardrailViolations } from '@hare/db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
	CreateGuardrailSchema,
	GuardrailSchema,
	GuardrailViolationSchema,
	IdParamSchema,
	SuccessSchema,
	UpdateGuardrailSchema,
} from '../../schemas'
import { notFound, requireWrite, serverError } from '../base'

// =============================================================================
// Helpers
// =============================================================================

function serializeGuardrail(g: typeof guardrails.$inferSelect): z.infer<typeof GuardrailSchema> {
	return {
		id: g.id,
		agentId: g.agentId,
		name: g.name,
		description: g.description,
		type: g.type as z.infer<typeof GuardrailSchema>['type'],
		action: g.action as z.infer<typeof GuardrailSchema>['action'],
		enabled: g.enabled,
		config: g.config as z.infer<typeof GuardrailSchema>['config'],
		message: g.message,
		createdAt: g.createdAt.toISOString(),
		updatedAt: g.updatedAt.toISOString(),
	}
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List guardrails for an agent
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/guardrails' })
	.input(z.object({ agentId: z.string() }))
	.output(z.object({ guardrails: z.array(GuardrailSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const results = await db
			.select()
			.from(guardrails)
			.where(and(eq(guardrails.agentId, input.agentId), eq(guardrails.workspaceId, workspaceId)))
			.orderBy(desc(guardrails.createdAt))

		return { guardrails: results.map(serializeGuardrail) }
	})

/**
 * Create a guardrail
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/guardrails', successStatus: 201 })
	.input(CreateGuardrailSchema)
	.output(GuardrailSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify agent belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Agent not found')

		const [guardrail] = await db
			.insert(guardrails)
			.values({
				agentId: input.agentId,
				workspaceId,
				name: input.name,
				description: input.description,
				type: input.type,
				action: input.action ?? 'block',
				enabled: input.enabled ?? true,
				config: input.config,
				message: input.message,
			})
			.returning()

		if (!guardrail) serverError('Failed to create guardrail')

		return serializeGuardrail(guardrail)
	})

/**
 * Update a guardrail
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/guardrails/{id}' })
	.input(IdParamSchema.merge(UpdateGuardrailSchema))
	.output(GuardrailSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		const updateData: Partial<typeof guardrails.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.action !== undefined && { action: data.action }),
			...(data.enabled !== undefined && { enabled: data.enabled }),
			...(data.config !== undefined && { config: data.config }),
			...(data.message !== undefined && { message: data.message }),
		}

		const [guardrail] = await db
			.update(guardrails)
			.set(updateData)
			.where(and(eq(guardrails.id, id), eq(guardrails.workspaceId, workspaceId)))
			.returning()

		if (!guardrail) notFound('Guardrail not found')

		return serializeGuardrail(guardrail)
	})

/**
 * Delete a guardrail
 */
export const remove = requireWrite
	.route({ method: 'DELETE', path: '/guardrails/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const result = await db
			.delete(guardrails)
			.where(and(eq(guardrails.id, input.id), eq(guardrails.workspaceId, workspaceId)))
			.returning()

		if (result.length === 0) notFound('Guardrail not found')

		return { success: true }
	})

/**
 * Get guardrail violations for an agent
 */
export const getViolations = requireWrite
	.route({ method: 'GET', path: '/guardrails/violations' })
	.input(
		z.object({
			agentId: z.string(),
			limit: z.coerce.number().int().min(1).max(100).optional().default(50),
			offset: z.coerce.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			violations: z.array(GuardrailViolationSchema),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [countResult] = await db
			.select({ total: count() })
			.from(guardrailViolations)
			.where(
				and(
					eq(guardrailViolations.agentId, input.agentId),
					eq(guardrailViolations.workspaceId, workspaceId),
				),
			)

		const results = await db
			.select()
			.from(guardrailViolations)
			.where(
				and(
					eq(guardrailViolations.agentId, input.agentId),
					eq(guardrailViolations.workspaceId, workspaceId),
				),
			)
			.orderBy(desc(guardrailViolations.createdAt))
			.limit(input.limit)
			.offset(input.offset)

		return {
			violations: results.map((v) => ({
				id: v.id,
				guardrailId: v.guardrailId,
				agentId: v.agentId,
				direction: v.direction as 'input' | 'output',
				actionTaken: v.actionTaken as z.infer<typeof GuardrailViolationSchema>['actionTaken'],
				triggerContent: v.triggerContent,
				details: v.details as z.infer<typeof GuardrailViolationSchema>['details'],
				createdAt: v.createdAt.toISOString(),
			})),
			total: countResult?.total ?? 0,
		}
	})

// =============================================================================
// Router Export
// =============================================================================

export const guardrailsRouter = {
	list,
	create,
	update,
	delete: remove,
	getViolations,
}
