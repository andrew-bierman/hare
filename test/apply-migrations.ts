/**
 * Test setup file that applies D1 migrations before tests run.
 *
 * Uses Cloudflare's applyD1Migrations API to ensure the test database
 * schema matches production. Migrations are loaded from apps/web/migrations/
 * via readD1Migrations in vitest.config.ts.
 *
 * This runs outside isolated storage, so migrations persist across all tests.
 */

import { applyD1Migrations, env } from 'cloudflare:test'

// Augment the cloudflare:test module with the bindings we use
declare module 'cloudflare:test' {
	interface ProvidedEnv {
		DB: D1Database
		KV: KVNamespace
		R2: R2Bucket
		TEST_MIGRATIONS: D1Migration[]
	}
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
