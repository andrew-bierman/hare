/**
 * Subscription Checks for oRPC
 *
 * Provides both:
 * 1. Standalone functions for checking limits (usable from any handler)
 * 2. oRPC middleware for workspace-scoped routes (agent creation)
 *
 * Uses the Better Auth Stripe plugin's `subscription` table as the source
 * of truth, with fallback to the free plan when no active subscription exists.
 */

import { ORPCError } from '@orpc/server'
import { eq, and, gte, count as dbCount, sql } from 'drizzle-orm'
import { subscriptions, usage, agents, workspaces } from '@hare/db/schema'
import { getPlanLimits } from '@hare/auth/server'
import { requireWrite } from './base'
import type { Database } from '@hare/db'

// =============================================================================
// Standalone Functions (usable from any handler)
// =============================================================================

/**
 * Get the active subscription for a user. Returns null if on free plan.
 */
export async function getActiveSubscription(db: Database, userId: string) {
	const [sub] = await db
		.select()
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.referenceId, userId),
				eq(subscriptions.status, 'active'),
			),
		)
		.limit(1)

	// Also check for trialing status
	if (!sub) {
		const [trialSub] = await db
			.select()
			.from(subscriptions)
			.where(
				and(
					eq(subscriptions.referenceId, userId),
					eq(subscriptions.status, 'trialing'),
				),
			)
			.limit(1)

		return trialSub ?? null
	}

	return sub
}

/**
 * Get the plan name for a workspace by looking up the owner's subscription.
 */
export async function getWorkspacePlan(db: Database, workspaceId: string) {
	// Find the workspace owner
	const [ws] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	if (!ws) return 'free'

	const sub = await getActiveSubscription(db, ws.ownerId)
	return sub?.plan ?? 'free'
}

/**
 * Check if a workspace can create more agents.
 * Throws ORPCError if over limit.
 */
export async function enforceAgentQuota(db: Database, workspaceId: string) {
	const planName = await getWorkspacePlan(db, workspaceId)
	const limits = getPlanLimits(planName)

	if (limits.maxAgents === -1) return // unlimited

	const [result] = await db
		.select({ count: dbCount() })
		.from(agents)
		.where(
			and(
				eq(agents.workspaceId, workspaceId),
				sql`${agents.status} != 'archived'`,
			),
		)

	const agentCount = result?.count ?? 0
	if (agentCount >= limits.maxAgents) {
		throw new ORPCError('FORBIDDEN', {
			message: `Agent limit reached (${agentCount}/${limits.maxAgents}). Upgrade your plan for more agents.`,
		})
	}
}

/**
 * Check if a workspace can send more messages this billing period.
 * Throws ORPCError if over limit.
 */
export async function enforceMessageQuota(db: Database, workspaceId: string) {
	// Find workspace owner to get their subscription
	const [ws] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	if (!ws) return

	const sub = await getActiveSubscription(db, ws.ownerId)
	const planName = sub?.plan ?? 'free'
	const limits = getPlanLimits(planName)

	if (limits.maxMessagesPerMonth === -1) return // unlimited

	const periodStart = sub?.periodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

	const [result] = await db
		.select({ count: dbCount() })
		.from(usage)
		.where(
			and(
				eq(usage.workspaceId, workspaceId),
				eq(usage.type, 'chat'),
				gte(usage.createdAt, periodStart),
			),
		)

	const messageCount = result?.count ?? 0
	if (messageCount >= limits.maxMessagesPerMonth) {
		throw new ORPCError('FORBIDDEN', {
			message: `Message limit reached (${messageCount}/${limits.maxMessagesPerMonth}). Upgrade your plan for more messages.`,
		})
	}
}

// =============================================================================
// oRPC Middleware (for workspace-scoped routes)
// =============================================================================

/**
 * Middleware that enforces agent creation quota before the handler runs.
 * Composes with requireWrite (needs workspace context).
 */
export const requireAgentQuota = requireWrite.use(async ({ context, next }) => {
	await enforceAgentQuota(context.db, context.workspaceId)
	return next({ context })
})
