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
	__resetAgentCounters,
	__resetToolCounter,
	__resetUserCounter,
	__resetWebhookCounter,
	__resetWorkspaceCounter,
	type AgentConfig,
	// Agent factories
	createTestAgent,
	createTestAgents,
	createTestAgentTool,
	createTestAgentVersion,
	createTestCustomTool,
	createTestHttpTool,
	// Tool factories
	createTestTool,
	createTestTools,
	// User factories
	createTestUser,
	createTestUsers,
	// Webhook factories
	createTestWebhook,
	createTestWebhookLog,
	createTestWebhooks,
	// Workspace factories
	createTestWorkspace,
	createTestWorkspaceInvitation,
	createTestWorkspaceMember,
	createTestWorkspaces,
	// Reset all counters
	resetAllFactoryCounters,
	type TestAgent,
	type TestAgentOverrides,
	type TestAgentTool,
	type TestAgentToolOverrides,
	type TestAgentVersion,
	type TestAgentVersionOverrides,
	type TestTool,
	type TestToolOverrides,
	type TestUser,
	type TestUserOverrides,
	type TestWebhook,
	type TestWebhookLog,
	type TestWebhookLogOverrides,
	type TestWebhookOverrides,
	type TestWorkspace,
	type TestWorkspaceInvitation,
	type TestWorkspaceInvitationOverrides,
	type TestWorkspaceMember,
	type TestWorkspaceMemberOverrides,
	type TestWorkspaceOverrides,
	type ToolConfig,
	type ToolInputSchema,
	WEBHOOK_EVENT_TYPES,
	WEBHOOK_LOG_STATUSES,
	WEBHOOK_STATUSES,
	type WebhookEventType,
	type WebhookLogStatus,
	type WebhookStatus,
} from './factories'

// Mocks
export {
	__resetCounter,
	type CreateMockEnvOptions,
	// CUID2 mock
	createId,
	createMockAI,
	createMockD1,
	createMockEnv,
	// Cloudflare binding mocks
	createMockKV,
	createMockR2,
	createMockVectorize,
	init,
	isCuid,
	type MockAi,
	type MockD1Database,
	type MockD1Result,
	type MockKVNamespace,
	type MockR2Bucket,
	type MockVectorizeIndex,
} from './mocks'

// Seeds
export {
	cleanupSeededData,
	type SeedAgentOptions,
	type SeedAgentResult,
	type SeedAgentWithToolsOptions,
	type SeedAgentWithToolsResult,
	type SeedAgentWithWebhooksOptions,
	type SeedAgentWithWebhooksResult,
	type SeedCompleteEnvironmentOptions,
	type SeedCompleteEnvironmentResult,
	type SeedWorkspaceOptions,
	type SeedWorkspaceResult,
	seedAgent,
	seedAgentWithTools,
	seedAgentWithWebhooks,
	seedCompleteEnvironment,
	seedWorkspace,
} from './seeds'
