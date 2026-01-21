/**
 * Test factories for creating entity data.
 *
 * All factories accept optional overrides for customization
 * and provide sensible defaults for quick test setup.
 */

// User factories
export {
	createTestUser,
	createTestUsers,
	__resetUserCounter,
	type TestUser,
	type TestUserOverrides,
} from './user'

// Workspace factories
export {
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
} from './workspace'

// Agent factories
export {
	createTestAgent,
	createTestAgents,
	createTestAgentVersion,
	__resetAgentCounters,
	type TestAgent,
	type TestAgentOverrides,
	type TestAgentVersion,
	type TestAgentVersionOverrides,
	type AgentConfig,
} from './agent'

// Tool factories
export {
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
} from './tool'

// Webhook factories
export {
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
} from './webhook'

// Import reset functions for resetAllFactoryCounters
import { __resetUserCounter } from './user'
import { __resetWorkspaceCounter } from './workspace'
import { __resetAgentCounters } from './agent'
import { __resetToolCounter } from './tool'
import { __resetWebhookCounter } from './webhook'

/**
 * Reset all factory counters. Call this in beforeEach/afterEach
 * for predictable test data.
 */
export function resetAllFactoryCounters(): void {
	__resetUserCounter()
	__resetWorkspaceCounter()
	__resetAgentCounters()
	__resetToolCounter()
	__resetWebhookCounter()
}
