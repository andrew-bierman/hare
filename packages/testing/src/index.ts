/**
 * @hare/testing - Shared test utilities, factories, and mocks for Hare platform
 *
 * This package provides:
 * - Factory functions for creating test data
 * - Database seeding utilities for integration tests
 * - Mock builders for Cloudflare bindings (D1, KV, R2, AI)
 *
 * @example
 * ```ts
 * import {
 *   createTestUser,
 *   createTestWorkspace,
 *   createTestAgent,
 *   createMockEnv,
 *   seedWorkspace
 * } from '@hare/testing'
 *
 * // Create test entities
 * const user = createTestUser({ name: 'Test User' })
 * const workspace = createTestWorkspace({ ownerId: user.id })
 *
 * // Create mock Cloudflare environment
 * const env = createMockEnv({
 *   kvData: { 'key': 'value' },
 *   aiResponses: { 'llama': { response: 'Hello' } }
 * })
 *
 * // Seed database for integration tests
 * const { user, workspace, agent } = await seedAgent(db)
 * ```
 */

// Factories
export {
	// User factories
	createTestUser,
	createTestUsers,
	__resetUserCounter,
	type TestUser,
	type TestUserOverrides,
	// Workspace factories
	createTestWorkspace,
	createTestWorkspaces,
	createTestWorkspaceMember,
	createTestWorkspaceInvitation,
	__resetWorkspaceCounter,
	type TestWorkspace,
	type TestWorkspaceOverrides,
	type TestWorkspaceMember,
	type TestWorkspaceMemberOverrides,
	type TestWorkspaceInvitation,
	type TestWorkspaceInvitationOverrides,
	// Agent factories
	createTestAgent,
	createTestAgents,
	createTestAgentVersion,
	__resetAgentCounters,
	type TestAgent,
	type TestAgentOverrides,
	type TestAgentVersion,
	type TestAgentVersionOverrides,
	type AgentConfig,
	// Tool factories
	createTestTool,
	createTestTools,
	createTestHttpTool,
	createTestCustomTool,
	createTestAgentTool,
	__resetToolCounter,
	type TestTool,
	type TestToolOverrides,
	type TestAgentTool,
	type TestAgentToolOverrides,
	type ToolInputSchema,
	type ToolConfig,
	// Webhook factories
	createTestWebhook,
	createTestWebhooks,
	createTestWebhookLog,
	__resetWebhookCounter,
	WEBHOOK_EVENT_TYPES,
	WEBHOOK_STATUSES,
	WEBHOOK_LOG_STATUSES,
	type TestWebhook,
	type TestWebhookOverrides,
	type TestWebhookLog,
	type TestWebhookLogOverrides,
	type WebhookEventType,
	type WebhookStatus,
	type WebhookLogStatus,
	// Reset all counters
	resetAllFactoryCounters,
} from './factories'

// Mocks
export {
	// CUID2 mock
	createId,
	init,
	isCuid,
	__resetCounter,
	// Cloudflare binding mocks
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
	type MockAi,
	type MockVectorizeIndex,
	type CreateMockEnvOptions,
} from './mocks'

// Seeds
export {
	seedWorkspace,
	seedAgent,
	seedAgentWithTools,
	seedAgentWithWebhooks,
	seedCompleteEnvironment,
	cleanupSeededData,
	type SeedWorkspaceResult,
	type SeedAgentResult,
	type SeedAgentWithToolsResult,
	type SeedAgentWithWebhooksResult,
	type SeedCompleteEnvironmentResult,
	type SeedWorkspaceOptions,
	type SeedAgentOptions,
	type SeedAgentWithToolsOptions,
	type SeedAgentWithWebhooksOptions,
	type SeedCompleteEnvironmentOptions,
} from './seeds'
