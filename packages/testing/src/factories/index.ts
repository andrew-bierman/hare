/**
 * Test factories for creating entity data.
 *
 * All factories accept optional overrides for customization
 * and provide sensible defaults for quick test setup.
 */

// Agent factories
export {
	__resetAgentCounters,
	type AgentConfig,
	createTestAgent,
	createTestAgents,
	createTestAgentVersion,
	type TestAgent,
	type TestAgentOverrides,
	type TestAgentVersion,
	type TestAgentVersionOverrides,
} from './agent'
// Tool factories
export {
	__resetToolCounter,
	createTestAgentTool,
	createTestCustomTool,
	createTestHttpTool,
	createTestTool,
	createTestTools,
	type TestAgentTool,
	type TestAgentToolOverrides,
	type TestTool,
	type TestToolOverrides,
	type ToolConfig,
	type ToolInputSchema,
} from './tool'
// User factories
export {
	__resetUserCounter,
	createTestUser,
	createTestUsers,
	type TestUser,
	type TestUserOverrides,
} from './user'
// Webhook factories
export {
	__resetWebhookCounter,
	createTestWebhook,
	createTestWebhookLog,
	createTestWebhooks,
	type TestWebhook,
	type TestWebhookLog,
	type TestWebhookLogOverrides,
	type TestWebhookOverrides,
	WEBHOOK_EVENT_TYPES,
	WEBHOOK_LOG_STATUSES,
	WEBHOOK_STATUSES,
	type WebhookEventType,
	type WebhookLogStatus,
	type WebhookStatus,
} from './webhook'
// Workspace factories
export {
	__resetWorkspaceCounter,
	createTestWorkspace,
	createTestWorkspaceInvitation,
	createTestWorkspaceMember,
	createTestWorkspaces,
	type TestWorkspace,
	type TestWorkspaceInvitation,
	type TestWorkspaceInvitationOverrides,
	type TestWorkspaceMember,
	type TestWorkspaceMemberOverrides,
	type TestWorkspaceOverrides,
} from './workspace'

import { __resetAgentCounters } from './agent'
import { __resetToolCounter } from './tool'
// Import reset functions for resetAllFactoryCounters
import { __resetUserCounter } from './user'
import { __resetWebhookCounter } from './webhook'
import { __resetWorkspaceCounter } from './workspace'

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
