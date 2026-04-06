/**
 * Usage Recording
 *
 * Shared helper for recording usage across all interaction paths.
 * Lives in @hare/db so both @hare/api and @hare/agent can import it
 * without circular dependencies.
 */

import type { Database } from './client'
import { usage } from './schema/usage'

export const USAGE_TYPES = ['chat', 'embed', 'websocket', 'mcp_tool', 'tool_execution'] as const
export type UsageType = (typeof USAGE_TYPES)[number]

export interface RecordUsageOptions {
	db: Database
	workspaceId: string
	agentId: string
	userId: string | null
	type: UsageType
	usage: {
		inputTokens: number | undefined
		outputTokens: number | undefined
		totalTokens: number | undefined
	}
	metadata?: { model?: string; duration?: number; endpoint?: string; statusCode?: number }
}

/**
 * Record a usage entry to D1. Catches and logs errors internally —
 * callers should wrap this in waitUntil() so it never blocks responses.
 */
export async function recordUsage(options: RecordUsageOptions): Promise<void> {
	const { db, workspaceId, agentId, userId, type, usage: tokenUsage, metadata } = options

	// Guard against NaN/Infinity/undefined from providers that don't report usage
	const inputTokens = Number.isFinite(tokenUsage.inputTokens)
		? (tokenUsage.inputTokens as number)
		: 0
	const outputTokens = Number.isFinite(tokenUsage.outputTokens)
		? (tokenUsage.outputTokens as number)
		: 0
	const totalTokens = inputTokens + outputTokens

	try {
		await db.insert(usage).values({
			workspaceId,
			agentId,
			userId,
			type,
			inputTokens,
			outputTokens,
			totalTokens,
			cost: 0,
			metadata: metadata ?? null,
		})
	} catch (err) {
		console.error('Usage insert failed:', err)
	}
}
