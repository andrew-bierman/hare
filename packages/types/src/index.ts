/**
 * @hare/types
 *
 * Centralized type definitions for the Hare platform.
 * This package is the single source of truth for all shared types.
 */

// Agent types (all derived from Zod schemas)
export {
	// Schemas
	ScheduledTaskSchema,
	HareAgentStateSchema,
	ChatPayloadSchema,
	ToolExecutePayloadSchema,
	SchedulePayloadSchema,
	ConfigurePayloadSchema,
	ClientMessageSchema,
	ServerMessageSchema,
	McpAgentStateSchema,
	// Types (inferred from schemas)
	type ScheduledTask,
	type HareAgentState,
	type ChatPayload,
	type ToolExecutePayload,
	type SchedulePayload,
	type ConfigurePayload,
	type ClientMessage,
	type ServerMessage,
	type McpAgentState,
	// Defaults
	DEFAULT_HARE_AGENT_STATE,
	DEFAULT_MCP_AGENT_STATE,
} from './agent'

// Database types
export {
	ToolCallSchema,
	type ToolCall,
	ToolResultSchema,
	type ToolResult,
	TokenUsageSchema,
	type TokenUsage,
	MessageMetadataSchema,
	type MessageMetadata,
} from './db'

// Tool types
export { ToolTypeSchema, type ToolType, ToolConfigSchema, type ToolConfig } from './tool'

// AI SDK types (re-exported for monorepo consistency)
export type {
	ModelMessage,
	SystemModelMessage,
	UserModelMessage,
	AssistantModelMessage,
	ToolModelMessage,
	LanguageModel,
	LanguageModelUsage,
} from './ai'

// API types
export {
	// Auth types
	AuthUserSchema,
	type AuthUser,
	AuthSessionSchema,
	type AuthSession,
	WorkspaceInfoSchema,
	type WorkspaceInfo,
	AuthVariablesSchema,
	type AuthVariables,
	ApiKeyPermissionsSchema,
	type ApiKeyPermissions,
	ApiKeySchema,
	type ApiKey,
	ApiKeyWithSecretSchema,
	type ApiKeyWithSecret,
	type OAuthProviders,
	ApiKeyInfoSchema,
	type ApiKeyInfo,
	ApiKeyVariablesSchema,
	type ApiKeyVariables,
	type WorkspaceVariables,
	type HonoEnv,
	type AuthEnv,
	type WorkspaceEnv,
	type ApiKeyEnv,
	type OptionalAuthEnv,
	// Database enums
	WorkspaceRoleSchema,
	type WorkspaceRole,
	isWorkspaceRole,
	assertWorkspaceRole,
	MessageRoleSchema,
	type MessageRole,
	isMessageRole,
	assertMessageRole,
	// Agent types
	AgentStatusSchema,
	type AgentStatus,
	AgentConfigSchema,
	type AgentConfig,
	AgentSchema,
	type Agent,
	CreateAgentInputSchema,
	type CreateAgentInput,
	UpdateAgentInputSchema,
	type UpdateAgentInput,
	// Tool types
	ToolSchema,
	type Tool,
	CreateToolInputSchema,
	type CreateToolInput,
	// Workspace types
	WorkspaceSchema,
	type Workspace,
	CreateWorkspaceInputSchema,
	type CreateWorkspaceInput,
	// Usage types
	UsageSummarySchema,
	type UsageSummary,
	AgentUsageSchema,
	type AgentUsage,
	// Chat types
	ChatMessageRoleSchema,
	ChatMessageSchema,
	type ChatMessage,
	ChatRequestSchema,
	type ChatRequest,
	ChatStreamEventTypeSchema,
	ChatStreamEventSchema,
	type ChatStreamEvent,
	// API response types
	ApiErrorSchema,
	type ApiError,
	ApiSuccessSchema,
	type ApiSuccess,
	// Schedule types
	ScheduleTypeSchema,
	type ScheduleType,
	ScheduleStatusSchema,
	type ScheduleStatus,
	ExecutionStatusSchema,
	type ExecutionStatus,
	ScheduleSchema,
	type Schedule,
	CreateScheduleInputSchema,
	type CreateScheduleInput,
	UpdateScheduleInputSchema,
	type UpdateScheduleInput,
	ExecutionResultSchema,
	type ExecutionResult,
	ScheduleExecutionSchema,
	type ScheduleExecution,
	// Workspace member types
	MemberRoleSchema,
	type MemberRole,
	InvitationStatusSchema,
	type InvitationStatus,
	WorkspaceMemberSchema,
	type WorkspaceMember,
	WorkspaceInvitationSchema,
	type WorkspaceInvitation,
	SendInvitationInputSchema,
	type SendInvitationInput,
	UpdateMemberRoleInputSchema,
	type UpdateMemberRoleInput,
} from './api'

// Cloudflare types
export { type CloudflareEnv } from './cloudflare'
