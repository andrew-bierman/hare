/**
 * oRPC Triggers Router
 *
 * Handles event-driven trigger CRUD and execution history.
 */

import { createId } from '@hare/db'
import { agents, agentTriggers, triggerExecutions } from '@hare/db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
	CreateTriggerSchema,
	IdParamSchema,
	SuccessSchema,
	TriggerExecutionSchema,
	TriggerSchema,
	UpdateTriggerSchema,
} from '../../schemas'
import { badRequest, notFound, requireAdmin, requireWrite, serverError } from '../base'

// =============================================================================
// Helpers
// =============================================================================

function serializeTrigger(t: typeof agentTriggers.$inferSelect): z.infer<typeof TriggerSchema> {
	return {
		id: t.id,
		agentId: t.agentId,
		type: t.type as z.infer<typeof TriggerSchema>['type'],
		name: t.name,
		description: t.description,
		config: t.config as z.infer<typeof TriggerSchema>['config'],
		enabled: t.enabled,
		status: t.status as z.infer<typeof TriggerSchema>['status'],
		webhookPath: t.webhookPath,
		webhookUrl: t.webhookPath ? `/api/triggers/webhook/${t.webhookPath}` : null,
		lastTriggeredAt: t.lastTriggeredAt?.toISOString() ?? null,
		triggerCount: t.triggerCount,
		createdAt: t.createdAt.toISOString(),
		updatedAt: t.updatedAt.toISOString(),
	}
}

function serializeExecution(
	e: typeof triggerExecutions.$inferSelect,
): z.infer<typeof TriggerExecutionSchema> {
	return {
		id: e.id,
		triggerId: e.triggerId,
		agentId: e.agentId,
		status: e.status as z.infer<typeof TriggerExecutionSchema>['status'],
		input: e.input as z.infer<typeof TriggerExecutionSchema>['input'],
		output: e.output as z.infer<typeof TriggerExecutionSchema>['output'],
		startedAt: e.startedAt.toISOString(),
		completedAt: e.completedAt?.toISOString() ?? null,
		durationMs: e.durationMs,
		error: e.error,
	}
}

// =============================================================================
// Procedures
// =============================================================================

/**
 * List triggers for an agent
 */
export const list = requireWrite
	.route({ method: 'GET', path: '/triggers' })
	.input(z.object({ agentId: z.string().optional() }))
	.output(z.object({ triggers: z.array(TriggerSchema) }))
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Get agent IDs in this workspace
		const workspaceAgents = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.workspaceId, workspaceId))

		const agentIds = workspaceAgents.map((a) => a.id)
		if (agentIds.length === 0) return { triggers: [] }

		let results: (typeof agentTriggers.$inferSelect)[]
		if (input.agentId) {
			if (!agentIds.includes(input.agentId)) return { triggers: [] }
			results = await db
				.select()
				.from(agentTriggers)
				.where(eq(agentTriggers.agentId, input.agentId))
				.orderBy(desc(agentTriggers.createdAt))
		} else {
			results = await db
				.select()
				.from(agentTriggers)
				.where(eq(agentTriggers.agentId, agentIds[0]!))
				.orderBy(desc(agentTriggers.createdAt))
			// For multiple agents, query all
			if (agentIds.length > 1) {
				const { inArray } = await import('drizzle-orm')
				results = await db
					.select()
					.from(agentTriggers)
					.where(inArray(agentTriggers.agentId, agentIds))
					.orderBy(desc(agentTriggers.createdAt))
			}
		}

		return { triggers: results.map(serializeTrigger) }
	})

/**
 * Get a single trigger
 */
export const get = requireWrite
	.route({ method: 'GET', path: '/triggers/{id}' })
	.input(IdParamSchema)
	.output(TriggerSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [trigger] = await db.select().from(agentTriggers).where(eq(agentTriggers.id, input.id))

		if (!trigger) notFound('Trigger not found')

		// Verify agent belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, trigger.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Trigger not found')

		return serializeTrigger(trigger)
	})

/**
 * Create a trigger
 */
export const create = requireWrite
	.route({ method: 'POST', path: '/triggers', successStatus: 201 })
	.input(CreateTriggerSchema)
	.output(TriggerSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId, user } = context

		// Verify agent belongs to workspace
		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, input.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Agent not found')

		const webhookPath = input.type === 'webhook' ? createId() : null

		const [trigger] = await db
			.insert(agentTriggers)
			.values({
				agentId: input.agentId,
				type: input.type,
				name: input.name,
				description: input.description,
				config: input.config,
				enabled: input.enabled ?? true,
				webhookPath,
				createdBy: user.id,
			})
			.returning()

		if (!trigger) serverError('Failed to create trigger')

		return serializeTrigger(trigger)
	})

/**
 * Update a trigger
 */
export const update = requireWrite
	.route({ method: 'PATCH', path: '/triggers/{id}' })
	.input(IdParamSchema.merge(UpdateTriggerSchema))
	.output(TriggerSchema)
	.handler(async ({ input, context }) => {
		const { id, ...data } = input
		const { db, workspaceId } = context

		// Verify trigger's agent belongs to workspace
		const [existing] = await db.select().from(agentTriggers).where(eq(agentTriggers.id, id))
		if (!existing) notFound('Trigger not found')

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, existing.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Trigger not found')

		const updateData: Partial<typeof agentTriggers.$inferInsert> = {
			updatedAt: new Date(),
			...(data.name !== undefined && { name: data.name }),
			...(data.description !== undefined && { description: data.description }),
			...(data.config !== undefined && { config: data.config }),
			...(data.enabled !== undefined && { enabled: data.enabled }),
			...(data.status !== undefined && { status: data.status }),
		}

		const [trigger] = await db
			.update(agentTriggers)
			.set(updateData)
			.where(eq(agentTriggers.id, id))
			.returning()

		if (!trigger) notFound('Trigger not found')

		return serializeTrigger(trigger)
	})

/**
 * Delete a trigger
 */
export const remove = requireAdmin
	.route({ method: 'DELETE', path: '/triggers/{id}' })
	.input(IdParamSchema)
	.output(SuccessSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify trigger's agent belongs to workspace
		const [existing] = await db.select().from(agentTriggers).where(eq(agentTriggers.id, input.id))
		if (!existing) notFound('Trigger not found')

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, existing.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Trigger not found')

		await db.delete(agentTriggers).where(eq(agentTriggers.id, input.id))

		return { success: true }
	})

/**
 * Get execution history for a trigger
 */
export const getExecutions = requireWrite
	.route({ method: 'GET', path: '/triggers/{id}/executions' })
	.input(
		IdParamSchema.extend({
			limit: z.coerce.number().int().min(1).max(100).optional().default(50),
			offset: z.coerce.number().int().min(0).optional().default(0),
		}),
	)
	.output(
		z.object({
			executions: z.array(TriggerExecutionSchema),
			total: z.number().int(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		// Verify trigger's agent belongs to workspace
		const [existing] = await db.select().from(agentTriggers).where(eq(agentTriggers.id, input.id))
		if (!existing) notFound('Trigger not found')

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, existing.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Trigger not found')

		const [countResult] = await db
			.select({ total: count() })
			.from(triggerExecutions)
			.where(eq(triggerExecutions.triggerId, input.id))

		const results = await db
			.select()
			.from(triggerExecutions)
			.where(eq(triggerExecutions.triggerId, input.id))
			.orderBy(desc(triggerExecutions.startedAt))
			.limit(input.limit)
			.offset(input.offset)

		return {
			executions: results.map(serializeExecution),
			total: countResult?.total ?? 0,
		}
	})

/**
 * Regenerate webhook path for a webhook trigger
 */
export const regenerateWebhookPath = requireAdmin
	.route({ method: 'POST', path: '/triggers/{id}/regenerate-webhook' })
	.input(IdParamSchema)
	.output(TriggerSchema)
	.handler(async ({ input, context }) => {
		const { db, workspaceId } = context

		const [existing] = await db.select().from(agentTriggers).where(eq(agentTriggers.id, input.id))
		if (!existing) notFound('Trigger not found')
		if (existing.type !== 'webhook')
			badRequest('Can only regenerate webhook path for webhook triggers')

		const [agent] = await db
			.select()
			.from(agents)
			.where(and(eq(agents.id, existing.agentId), eq(agents.workspaceId, workspaceId)))
		if (!agent) notFound('Trigger not found')

		const [trigger] = await db
			.update(agentTriggers)
			.set({ webhookPath: createId(), updatedAt: new Date() })
			.where(eq(agentTriggers.id, input.id))
			.returning()

		if (!trigger) serverError('Failed to regenerate webhook path')

		return serializeTrigger(trigger)
	})

// =============================================================================
// Router Export
// =============================================================================

export const triggersRouter = {
	list,
	get,
	create,
	update,
	delete: remove,
	getExecutions,
	regenerateWebhookPath,
}
