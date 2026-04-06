/**
 * Credits Service
 *
 * Token-based usage billing. 1 credit = 1 token.
 * Mirrors Cloudflare Workers AI pricing model.
 *
 * - Free allotment: 100,000 tokens/month (resets 1st of month)
 * - Credit packs: buy tokens in bulk at ~$0.01 per 1K tokens
 */

import type { Database } from '@hare/db'
import { workspaces } from '@hare/db/schema'
import { eq, sql } from 'drizzle-orm'

/** Free tokens given to every workspace each month */
export const FREE_MONTHLY_TOKENS = 100_000

/**
 * Credit pack options for purchase (1 credit = 1 token).
 *
 * Pricing: ~$0.10 per 1K tokens retail, covers CF Workers AI cost
 * with margin (CF cost varies $0.01-0.15/1K depending on model size).
 * Bulk discounts on larger packs.
 */
export const CREDIT_PACKS = [
	{ id: 'tokens_500k', credits: 500_000, price: 5, label: '500K tokens' },
	{ id: 'tokens_2m', credits: 2_000_000, price: 15, label: '2M tokens' },
	{ id: 'tokens_10m', credits: 10_000_000, price: 50, label: '10M tokens' },
] as const

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id']

/**
 * Get the current token balance for a workspace.
 * Resets the free allotment if a new month has started.
 */
export async function getCreditsBalance(options: {
	db: Database
	workspaceId: string
}): Promise<number> {
	const { db, workspaceId } = options

	const [ws] = await db
		.select({
			creditsBalance: workspaces.creditsBalance,
			freeCreditsResetAt: workspaces.freeCreditsResetAt,
		})
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))

	if (!ws) return 0

	// Reset free allotment on 1st of the month
	const now = new Date()
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

	if (!ws.freeCreditsResetAt || ws.freeCreditsResetAt < monthStart) {
		const newBalance = ws.creditsBalance + FREE_MONTHLY_TOKENS
		await db
			.update(workspaces)
			.set({
				creditsBalance: newBalance,
				freeCreditsResetAt: now,
				updatedAt: now,
			})
			.where(eq(workspaces.id, workspaceId))

		return newBalance
	}

	return ws.creditsBalance
}

/** Check if workspace has enough tokens for at least one request. */
export async function hasCredits(options: { db: Database; workspaceId: string }): Promise<boolean> {
	const balance = await getCreditsBalance(options)
	return balance > 0
}

/** Deduct tokens from workspace balance. Returns new balance. */
export async function deductCredits(options: {
	db: Database
	workspaceId: string
	amount: number
}): Promise<number> {
	const { db, workspaceId, amount } = options

	const result = await db
		.update(workspaces)
		.set({
			creditsBalance: sql`MAX(${workspaces.creditsBalance} - ${amount}, 0)`,
			updatedAt: new Date(),
		})
		.where(eq(workspaces.id, workspaceId))
		.returning({ creditsBalance: workspaces.creditsBalance })

	return result[0]?.creditsBalance ?? 0
}

/** Add tokens to workspace (after purchase). */
export async function addCredits(options: {
	db: Database
	workspaceId: string
	amount: number
}): Promise<number> {
	const { db, workspaceId, amount } = options

	const result = await db
		.update(workspaces)
		.set({
			creditsBalance: sql`${workspaces.creditsBalance} + ${amount}`,
			updatedAt: new Date(),
		})
		.where(eq(workspaces.id, workspaceId))
		.returning({ creditsBalance: workspaces.creditsBalance })

	return result[0]?.creditsBalance ?? 0
}
