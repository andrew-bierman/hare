/**
 * Mock builders and test doubles.
 *
 * Provides mocks for Cloudflare bindings and other
 * external dependencies used in tests.
 */

// CUID2 mock for deterministic IDs
export { createId, init, isCuid, __resetCounter } from './cuid2'

// Cloudflare binding mocks
export {
	createMockKV,
	createMockR2,
	createMockD1,
	createMockAI,
	createMockVectorize,
	createMockEnv,
	type MockKVNamespace,
	type MockR2Bucket,
	type MockD1Database,
	type MockD1Result,
	type MockD1PreparedStatement,
	type MockAi,
	type MockVectorizeIndex,
	type CreateMockEnvOptions,
} from './cloudflare'
