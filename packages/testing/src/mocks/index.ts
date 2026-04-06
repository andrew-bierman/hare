/**
 * Mock builders and test doubles.
 *
 * Provides mocks for Cloudflare bindings and other
 * external dependencies used in tests.
 */

// Cloudflare binding mocks
export {
	type CreateMockEnvOptions,
	createMockAI,
	createMockD1,
	createMockEnv,
	createMockKV,
	createMockR2,
	createMockVectorize,
	type MockAi,
	type MockD1Database,
	type MockD1PreparedStatement,
	type MockD1Result,
	type MockKVNamespace,
	type MockR2Bucket,
	type MockVectorizeIndex,
} from './cloudflare'
// CUID2 mock for deterministic IDs
export { __resetCounter, createId, init, isCuid } from './cuid2'
