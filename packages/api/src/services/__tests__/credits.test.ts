/**
 * Integration tests for the credits service.
 *
 * Uses real D1 (Miniflare) to verify atomic balance updates,
 * free-token grants, and guard conditions.
 *
 * Tests cover:
 * - Monthly free token allotment is granted on first balance check
 * - Free allotment is NOT double-granted in the same month
 * - hasCredits returns true/false correctly
 * - deductCredits reduces balance and allows overdraft (for overage tracking)
 * - addCredits increases balance
 * - Input validation (positive-only amounts)
 */

import { env } from 'cloudflare:test'
import { createDb } from '@hare/db'
import { users, workspaces } from '@hare/db/schema'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
	addCredits,
	deductCredits,
	FREE_MONTHLY_TOKENS,
	getCreditsBalance,
	hasCredits,
} from '../credits'

declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
	}
}

// =============================================================================
// Schema Setup — minimal tables required by the credits service
// =============================================================================

const MIGRATION_STATEMENTS = [
	`CREATE TABLE IF NOT EXISTS "user" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL UNIQUE, "emailVerified" integer DEFAULT false NOT NULL, "image" text, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,
	`CREATE TABLE IF NOT EXISTS "workspaces" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL UNIQUE, "description" text, "ownerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "stripeCustomerId" text, "stripeSubscriptionId" text, "planId" text DEFAULT 'free', "currentPeriodEnd" integer, "creditsBalance" integer DEFAULT 0 NOT NULL, "freeCreditsResetAt" integer, "createdAt" integer NOT NULL, "updatedAt" integer NOT NULL)`,
]

async function applyMigrations(d1: D1Database): Promise<void> {
	const stmts = MIGRATION_STATEMENTS.map((sql) => d1.prepare(sql))
	await d1.batch(stmts)
}

async function cleanupData(d1: D1Database): Promise<void> {
	await d1.prepare('DELETE FROM workspaces').run()
	await d1.prepare('DELETE FROM "user"').run()
}

// =============================================================================
// Helpers
// =============================================================================

const now = Math.floor(Date.now() / 1000)
let counter = 0

function nextId(prefix: string): string {
	return `${prefix}-${++counter}`
}

/** Insert a bare-minimum user row (required for workspaces FK). */
async function insertUser(d1: D1Database, id: string): Promise<void> {
	await d1
		.prepare(
			`INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`,
		)
		.bind(id, 'Test User', `${id}@test.example`, now, now)
		.run()
}

/**
 * Insert a workspace and return its ID.
 * freeCreditsResetAt: pass a Date to set it, null to leave NULL, undefined to default to now (already reset this month).
 */
async function insertWorkspace(
	d1: D1Database,
	opts: {
		creditsBalance?: number
		freeCreditsResetAt?: Date | null
		ownerId?: string
	} = {},
): Promise<string> {
	const wsId = nextId('ws')
	const ownerId = opts.ownerId ?? nextId('user')
	await insertUser(d1, ownerId)

	// freeCreditsResetAt in epoch seconds (D1 stores as integer for timestamp mode)
	const resetAt =
		opts.freeCreditsResetAt === undefined
			? now // default: already reset this month → no free grant
			: opts.freeCreditsResetAt === null
				? null
				: Math.floor(opts.freeCreditsResetAt.getTime() / 1000)

	const slug = `slug-${wsId}`
	await d1
		.prepare(
			`INSERT INTO workspaces (id, name, slug, ownerId, creditsBalance, freeCreditsResetAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(wsId, `Workspace ${wsId}`, slug, ownerId, opts.creditsBalance ?? 0, resetAt, now, now)
		.run()

	return wsId
}

// =============================================================================
// Test Suites
// =============================================================================

beforeAll(async () => {
	await applyMigrations(env.DB)
})

beforeEach(async () => {
	await cleanupData(env.DB)
})

describe('getCreditsBalance', () => {
	it('returns 0 for unknown workspace', async () => {
		const db = createDb(env.DB)
		const balance = await getCreditsBalance({ db, workspaceId: 'no-such-workspace' })
		expect(balance).toBe(0)
	})

	it('grants FREE_MONTHLY_TOKENS when freeCreditsResetAt is NULL', async () => {
		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: 0,
			freeCreditsResetAt: null,
		})
		const db = createDb(env.DB)

		const balance = await getCreditsBalance({ db, workspaceId: wsId })
		expect(balance).toBe(FREE_MONTHLY_TOKENS)
	})

	it('grants FREE_MONTHLY_TOKENS when last reset was in a prior month', async () => {
		const lastMonth = new Date()
		lastMonth.setMonth(lastMonth.getMonth() - 1)

		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: 200,
			freeCreditsResetAt: lastMonth,
		})
		const db = createDb(env.DB)

		const balance = await getCreditsBalance({ db, workspaceId: wsId })
		expect(balance).toBe(200 + FREE_MONTHLY_TOKENS)
	})

	it('does NOT grant free tokens when already reset this month', async () => {
		const thisMonthStart = new Date()
		thisMonthStart.setDate(1)
		thisMonthStart.setHours(0, 0, 0, 0)

		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: FREE_MONTHLY_TOKENS,
			freeCreditsResetAt: thisMonthStart,
		})
		const db = createDb(env.DB)

		const balance = await getCreditsBalance({ db, workspaceId: wsId })
		expect(balance).toBe(FREE_MONTHLY_TOKENS) // no double grant
	})

	it('returns persisted balance when no reset is needed', async () => {
		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: 99_999,
			freeCreditsResetAt: new Date(), // just now → same month
		})
		const db = createDb(env.DB)

		const balance = await getCreditsBalance({ db, workspaceId: wsId })
		expect(balance).toBe(99_999)
	})
})

describe('hasCredits', () => {
	it('returns true when balance is positive (no reset needed)', async () => {
		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: 500,
			freeCreditsResetAt: new Date(),
		})
		const db = createDb(env.DB)
		expect(await hasCredits({ db, workspaceId: wsId })).toBe(true)
	})

	it('returns false when balance is zero', async () => {
		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: 0,
			freeCreditsResetAt: new Date(),
		})
		const db = createDb(env.DB)
		expect(await hasCredits({ db, workspaceId: wsId })).toBe(false)
	})

	it('returns false when balance is negative', async () => {
		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: -50,
			freeCreditsResetAt: new Date(),
		})
		const db = createDb(env.DB)
		expect(await hasCredits({ db, workspaceId: wsId })).toBe(false)
	})

	it('returns true after free-token grant (was 0, null reset)', async () => {
		const wsId = await insertWorkspace(env.DB, {
			creditsBalance: 0,
			freeCreditsResetAt: null,
		})
		const db = createDb(env.DB)
		expect(await hasCredits({ db, workspaceId: wsId })).toBe(true)
	})
})

describe('deductCredits', () => {
	it('reduces the balance by the specified amount', async () => {
		const wsId = await insertWorkspace(env.DB, { creditsBalance: 1_000 })
		const db = createDb(env.DB)

		const newBalance = await deductCredits({ db, workspaceId: wsId, amount: 300 })
		expect(newBalance).toBe(700)
	})

	it('allows the balance to go negative (overage recording)', async () => {
		const wsId = await insertWorkspace(env.DB, { creditsBalance: 100 })
		const db = createDb(env.DB)

		const newBalance = await deductCredits({ db, workspaceId: wsId, amount: 500 })
		expect(newBalance).toBe(-400)
	})

	it('applies sequential deductions correctly', async () => {
		const wsId = await insertWorkspace(env.DB, { creditsBalance: 1_000 })
		const db = createDb(env.DB)

		expect(await deductCredits({ db, workspaceId: wsId, amount: 100 })).toBe(900)
		expect(await deductCredits({ db, workspaceId: wsId, amount: 200 })).toBe(700)
		expect(await deductCredits({ db, workspaceId: wsId, amount: 700 })).toBe(0)
	})

	it('throws when amount is 0', async () => {
		const db = createDb(env.DB)
		await expect(deductCredits({ db, workspaceId: 'any', amount: 0 })).rejects.toThrow(
			'amount must be positive',
		)
	})

	it('throws when amount is negative', async () => {
		const db = createDb(env.DB)
		await expect(deductCredits({ db, workspaceId: 'any', amount: -10 })).rejects.toThrow(
			'amount must be positive',
		)
	})
})

describe('addCredits', () => {
	it('increases balance by the specified amount', async () => {
		const wsId = await insertWorkspace(env.DB, { creditsBalance: 500 })
		const db = createDb(env.DB)

		const newBalance = await addCredits({ db, workspaceId: wsId, amount: 2_000_000 })
		expect(newBalance).toBe(2_000_500)
	})

	it('can recover a negative balance', async () => {
		const wsId = await insertWorkspace(env.DB, { creditsBalance: -200 })
		const db = createDb(env.DB)

		const newBalance = await addCredits({ db, workspaceId: wsId, amount: 700 })
		expect(newBalance).toBe(500)
	})

	it('throws when amount is 0', async () => {
		const db = createDb(env.DB)
		await expect(addCredits({ db, workspaceId: 'any', amount: 0 })).rejects.toThrow(
			'amount must be positive',
		)
	})

	it('throws when amount is negative', async () => {
		const db = createDb(env.DB)
		await expect(addCredits({ db, workspaceId: 'any', amount: -1 })).rejects.toThrow(
			'amount must be positive',
		)
	})
})
