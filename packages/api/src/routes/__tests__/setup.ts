/**
 * Test setup for API routes
 *
 * Migrations are now applied automatically via the global test/apply-migrations.ts
 * setup file using Cloudflare's applyD1Migrations API with Drizzle-generated
 * migration files from apps/web/migrations/.
 *
 * This file provides helper utilities for route integration tests.
 */

import { env } from 'cloudflare:test'

declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
		TEST_MIGRATIONS: D1Migration[]
	}
}

/**
 * Legacy migration function — now a no-op since migrations are applied
 * by the global setup file. Kept for backwards compatibility with
 * existing test files that call applyMigrations(env.DB) in beforeAll.
 */
export async function applyMigrations(_db: D1Database): Promise<void> {
	// No-op: migrations are applied by test/apply-migrations.ts
}

/**
 * Clean up all data from tables (preserves schema).
 * Use in beforeEach for test isolation.
 */
export async function cleanupTestData(db: D1Database): Promise<void> {
	await db.batch([
		db.prepare('DELETE FROM agent_tools'),
		db.prepare('DELETE FROM messages'),
		db.prepare('DELETE FROM conversations'),
		db.prepare('DELETE FROM usage'),
		db.prepare('DELETE FROM webhooks'),
		db.prepare('DELETE FROM webhook_logs'),
		db.prepare('DELETE FROM api_keys'),
		db.prepare('DELETE FROM agents'),
		db.prepare('DELETE FROM workspace_members'),
		db.prepare('DELETE FROM workspaces'),
		db.prepare('DELETE FROM session'),
		db.prepare('DELETE FROM account'),
		db.prepare('DELETE FROM verification'),
		db.prepare('DELETE FROM "user"'),
	])
}
