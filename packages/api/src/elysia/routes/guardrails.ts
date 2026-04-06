/**
 * Guardrail Routes
 *
 * Guardrail CRUD and violation tracking for agent safety.
 */

import { agents, guardrails, guardrailViolations } from '@hare/db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import type { z } from 'zod'
import {
	CreateGuardrailSchema,
	type GuardrailSchema,
	type GuardrailViolationSchema,
	UpdateGuardrailSchema,
} from '../../schemas'
import { writePlugin } from '../context'

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
// Routes
// =============================================================================

export const guardrailRoutes = new Elysia({ prefix: '/guardrails', name: 'guardrail-routes' })
	.use(writePlugin)

	// List guardrails for an agent
	.get(
		'/',
		async ({ db, workspaceId, query }) => {
			const agentId = query?.agentId
			if (!agentId) return status(400, { error: 'agentId query parameter is required' })

			const results = await db
				.select()
				.from(guardrails)
				.where(and(eq(guardrails.agentId, agentId), eq(guardrails.workspaceId, workspaceId)))
				.orderBy(desc(guardrails.createdAt))

			return { guardrails: results.map(serializeGuardrail) }
		},
		{ writeAccess: true },
	)

	// Create a guardrail
	.post(
		'/',
		async ({ db, workspaceId, body }) => {
			// Verify agent belongs to workspace
			const [agent] = await db
				.select()
				.from(agents)
				.where(and(eq(agents.id, body.agentId), eq(agents.workspaceId, workspaceId)))
			if (!agent) return status(404, { error: 'Agent not found' })

			const [guardrail] = await db
				.insert(guardrails)
				.values({
					agentId: body.agentId,
					workspaceId,
					name: body.name,
					description: body.description,
					type: body.type,
					action: body.action ?? 'block',
					enabled: body.enabled ?? true,
					config: body.config,
					message: body.message,
				})
				.returning()

			if (!guardrail) throw new Error('Failed to create guardrail')

			return serializeGuardrail(guardrail)
		},
		{ writeAccess: true, body: CreateGuardrailSchema },
	)

	// Update a guardrail
	.patch(
		'/:id',
		async ({ db, workspaceId, params, body }) => {
			const updateData: Partial<typeof guardrails.$inferInsert> = {
				updatedAt: new Date(),
				...(body.name !== undefined && { name: body.name }),
				...(body.description !== undefined && { description: body.description }),
				...(body.action !== undefined && { action: body.action }),
				...(body.enabled !== undefined && { enabled: body.enabled }),
				...(body.config !== undefined && { config: body.config }),
				...(body.message !== undefined && { message: body.message }),
			}

			const [guardrail] = await db
				.update(guardrails)
				.set(updateData)
				.where(and(eq(guardrails.id, params.id), eq(guardrails.workspaceId, workspaceId)))
				.returning()

			if (!guardrail) return status(404, { error: 'Guardrail not found' })

			return serializeGuardrail(guardrail)
		},
		{ writeAccess: true, body: UpdateGuardrailSchema },
	)

	// Delete a guardrail
	.delete(
		'/:id',
		async ({ db, workspaceId, params }) => {
			const result = await db
				.delete(guardrails)
				.where(and(eq(guardrails.id, params.id), eq(guardrails.workspaceId, workspaceId)))
				.returning()

			if (result.length === 0) return status(404, { error: 'Guardrail not found' })

			return { success: true }
		},
		{ writeAccess: true },
	)

	// Get guardrail violations for an agent
	.get(
		'/violations',
		async ({ db, workspaceId, query }) => {
			const agentId = query?.agentId
			if (!agentId) return status(400, { error: 'agentId query parameter is required' })

			const limit = Number(query?.limit) || 50
			const offset = Number(query?.offset) || 0

			const [countResult] = await db
				.select({ total: count() })
				.from(guardrailViolations)
				.where(
					and(
						eq(guardrailViolations.agentId, agentId),
						eq(guardrailViolations.workspaceId, workspaceId),
					),
				)

			const results = await db
				.select()
				.from(guardrailViolations)
				.where(
					and(
						eq(guardrailViolations.agentId, agentId),
						eq(guardrailViolations.workspaceId, workspaceId),
					),
				)
				.orderBy(desc(guardrailViolations.createdAt))
				.limit(limit)
				.offset(offset)

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
		},
		{ writeAccess: true },
	)
