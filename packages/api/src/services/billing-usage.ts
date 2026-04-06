/**
 * Billing Usage Service
 *
 * Tracks and queries usage data for billing purposes:
 * - Agent count (active agents in workspace)
 * - Message count (messages sent in current billing period)
 * - Token usage (total tokens consumed)
 */

import type { Database } from '@hare/db'
import { agents, usage } from '@hare/db/schema'
import { and, count, eq, gte, sql } from 'drizzle-orm'

// =============================================================================
// Types
// =============================================================================

export interface BillingUsageStats {
	/** Number of active agents (non-archived) */
	agentsUsed: number
	/** Number of messages sent in the current billing period */
	messagesUsed: number
	/** Total input tokens used in the billing period */
	inputTokens: number
	/** Total output tokens used in the billing period */
	outputTokens: number
	/** Total tokens (input + output) used in the billing period */
	totalTokens: number
}

export interface GetBillingUsageOptions {
	/** Database instance */
	db: Database
	/** Workspace ID to get usage for */
	workspaceId: string
	/** Start of the billing period (defaults to 30 days ago) */
	periodStart?: Date
}

// =============================================================================
// Usage Queries
// =============================================================================

/**
 * Get the count of active agents in a workspace.
 *
 * Active agents are those with status 'draft' or 'deployed' (not 'archived').
 */
export async function getActiveAgentCount(options: {
	db: Database
	workspaceId: string
}): Promise<number> {
	const { db, workspaceId } = options

	const [result] = await db
		.select({ count: count() })
		.from(agents)
		.where(
			and(
				eq(agents.workspaceId, workspaceId),
				// Count non-archived agents
				sql`${agents.status} != 'archived'`,
			),
		)

	return result?.count ?? 0
}

/**
 * Get the count of messages sent in the current billing period.
 *
 * Messages are tracked in the usage table with type 'chat'.
 */
export async function getMessageCount(options: {
	db: Database
	workspaceId: string
	periodStart: Date
}): Promise<number> {
	const { db, workspaceId, periodStart } = options

	const [result] = await db
		.select({ count: count() })
		.from(usage)
		.where(
			and(
				eq(usage.workspaceId, workspaceId),
				eq(usage.type, 'chat'),
				gte(usage.createdAt, periodStart),
			),
		)

	return result?.count ?? 0
}

/**
 * Get token usage statistics for the billing period.
 */
export async function getTokenUsage(options: {
	db: Database
	workspaceId: string
	periodStart: Date
}): Promise<{
	inputTokens: number
	outputTokens: number
	totalTokens: number
}> {
	const { db, workspaceId, periodStart } = options

	const [result] = await db
		.select({
			inputTokens: sql<number>`COALESCE(SUM(${usage.inputTokens}), 0)`,
			outputTokens: sql<number>`COALESCE(SUM(${usage.outputTokens}), 0)`,
			totalTokens: sql<number>`COALESCE(SUM(${usage.totalTokens}), 0)`,
		})
		.from(usage)
		.where(and(eq(usage.workspaceId, workspaceId), gte(usage.createdAt, periodStart)))

	return {
		inputTokens: result?.inputTokens ?? 0,
		outputTokens: result?.outputTokens ?? 0,
		totalTokens: result?.totalTokens ?? 0,
	}
}

/**
 * Get all billing usage statistics for a workspace.
 *
 * This is the main function used by the billing routes to get
 * current usage for comparison against plan limits.
 */
export async function getBillingUsage(options: GetBillingUsageOptions): Promise<BillingUsageStats> {
	const { db, workspaceId, periodStart } = options

	// Default to start of current month if no period specified
	const defaultPeriodStart = new Date()
	defaultPeriodStart.setDate(1)
	defaultPeriodStart.setHours(0, 0, 0, 0)

	const effectivePeriodStart = periodStart ?? defaultPeriodStart

	// Run queries in parallel for efficiency
	const [agentsUsed, messagesUsed, tokenUsage] = await Promise.all([
		getActiveAgentCount({ db, workspaceId }),
		getMessageCount({ db, workspaceId, periodStart: effectivePeriodStart }),
		getTokenUsage({ db, workspaceId, periodStart: effectivePeriodStart }),
	])

	return {
		agentsUsed,
		messagesUsed,
		...tokenUsage,
	}
}

/**
 * Check if a workspace has exceeded their plan limits.
 *
 * Returns which limits (if any) have been exceeded.
 */
export async function checkUsageLimits(options: {
	db: Database
	workspaceId: string
	limits: {
		maxAgents: number
		maxMessagesPerMonth: number
	}
	periodStart?: Date
}): Promise<{
	withinLimits: boolean
	agentsExceeded: boolean
	messagesExceeded: boolean
	usage: BillingUsageStats
}> {
	const { db, workspaceId, limits, periodStart } = options

	const usageStats = await getBillingUsage({ db, workspaceId, periodStart })

	// -1 means unlimited
	const agentsExceeded = limits.maxAgents !== -1 && usageStats.agentsUsed >= limits.maxAgents
	const messagesExceeded =
		limits.maxMessagesPerMonth !== -1 && usageStats.messagesUsed >= limits.maxMessagesPerMonth

	return {
		withinLimits: !agentsExceeded && !messagesExceeded,
		agentsExceeded,
		messagesExceeded,
		usage: usageStats,
	}
}
