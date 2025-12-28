/**
 * API Module - Re-exports from @hare/api package
 *
 * This module re-exports the API app and types from the @hare/api package.
 * Hooks are exported from ./hooks which remain in the web app.
 */

// Re-export all types for backwards compatibility
export type {
	// Domain types
	Agent,
	AgentConfig,
	AgentStatus,
	AgentUsage,
	ApiError,
	ApiKeyEnv,
	ApiKeyInfo,
	ApiKeyVariables,
	ApiSuccess,
	AppType,
	AuthEnv,
	AuthSession,
	AuthUser,
	AuthVariables,
	ChatMessage,
	ChatRequest,
	ChatStreamEvent,
	CreateAgentInput,
	CreateScheduleInput,
	CreateToolInput,
	CreateWorkspaceInput,
	ExecutionResult,
	ExecutionStatus,
	// Hono environment types
	HonoEnv,
	InvitationStatus,
	MemberRole,
	MessageRole,
	OptionalAuthEnv,
	Schedule,
	ScheduleExecution,
	ScheduleStatus,
	ScheduleType,
	SendInvitationInput,
	Tool,
	ToolType,
	UpdateAgentInput,
	UpdateMemberRoleInput,
	UpdateScheduleInput,
	UsageSummary,
	Workspace,
	WorkspaceEnv,
	WorkspaceInfo,
	WorkspaceInvitation,
	WorkspaceMember,
	// Enums
	WorkspaceRole,
	WorkspaceVariables,
} from '@hare/api'
// Re-export app and types from @hare/api package
export { app } from '@hare/api'
