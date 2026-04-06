/**
 * @hare/types
 *
 * Centralized type definitions for the Hare platform.
 * This package is the single source of truth for all shared types.
 */

// Agent types (all derived from Zod schemas)
export {
	type ChatPayload,
	ChatPayloadSchema,
	type ClientMessage,
	ClientMessageSchema,
	type ConfigurePayload,
	ConfigurePayloadSchema,
	// Defaults
	DEFAULT_HARE_AGENT_STATE,
	DEFAULT_MCP_AGENT_STATE,
	type HareAgentState,
	HareAgentStateSchema,
	type McpAgentState,
	McpAgentStateSchema,
	// Types (inferred from schemas)
	type ScheduledTask,
	// Schemas
	ScheduledTaskSchema,
	type SchedulePayload,
	SchedulePayloadSchema,
	type ServerMessage,
	ServerMessageSchema,
	type ToolExecutePayload,
	ToolExecutePayloadSchema,
} from './agent'
// AI SDK types (re-exported for monorepo consistency)
export type {
	AssistantModelMessage,
	LanguageModel,
	LanguageModelUsage,
	ModelMessage,
	SystemModelMessage,
	ToolModelMessage,
	UserModelMessage,
} from './ai'
// API types
export {
	type Agent,
	type AgentConfig,
	AgentConfigSchema,
	AgentSchema,
	type AgentStatus,
	// Agent types
	AgentStatusSchema,
	type AgentUsage,
	AgentUsageSchema,
	type ApiError,
	// API response types
	ApiErrorSchema,
	type ApiKey,
	type ApiKeyEnv,
	type ApiKeyInfo,
	ApiKeyInfoSchema,
	type ApiKeyPermissions,
	ApiKeyPermissionsSchema,
	// Full API key types
	ApiKeySchema,
	type ApiKeyVariables,
	ApiKeyVariablesSchema,
	type ApiKeyWithSecret,
	ApiKeyWithSecretSchema,
	type ApiSuccess,
	ApiSuccessSchema,
	type AuthEnv,
	type AuthSession,
	AuthSessionSchema,
	type AuthUser,
	// Auth types
	AuthUserSchema,
	type AuthVariables,
	AuthVariablesSchema,
	assertMessageRole,
	assertWorkspaceRole,
	type ChatMessage,
	// Chat types
	ChatMessageRoleSchema,
	ChatMessageSchema,
	type ChatRequest,
	ChatRequestSchema,
	type ChatStreamEvent,
	ChatStreamEventSchema,
	ChatStreamEventTypeSchema,
	// Cloudflare types
	type CloudflareEnv,
	type CreateAgentInput,
	CreateAgentInputSchema,
	type CreateApiKeyInput,
	CreateApiKeyInputSchema,
	type CreateScheduleInput,
	CreateScheduleInputSchema,
	type CreateToolInput,
	CreateToolInputSchema,
	type CreateWorkspaceInput,
	CreateWorkspaceInputSchema,
	type ExecutionResult,
	ExecutionResultSchema,
	type ExecutionStatus,
	ExecutionStatusSchema,
	type HonoEnv,
	type InvitationStatus,
	InvitationStatusSchema,
	isMessageRole,
	isWorkspaceRole,
	type MemberRole,
	// Workspace member types
	MemberRoleSchema,
	type MessageRole,
	MessageRoleSchema,
	// OAuth types
	type OAuthProviders,
	type OptionalAuthEnv,
	type OrpcEnv,
	type Schedule,
	type ScheduleExecution,
	ScheduleExecutionSchema,
	ScheduleSchema,
	type ScheduleStatus,
	ScheduleStatusSchema,
	type ScheduleType,
	// Schedule types
	ScheduleTypeSchema,
	type SendInvitationInput,
	SendInvitationInputSchema,
	type Tool,
	// Tool types
	ToolSchema,
	type UpdateAgentInput,
	UpdateAgentInputSchema,
	type UpdateApiKeyInput,
	UpdateApiKeyInputSchema,
	type UpdateMemberRoleInput,
	UpdateMemberRoleInputSchema,
	type UpdateScheduleInput,
	UpdateScheduleInputSchema,
	type UsageSummary,
	// Usage types
	UsageSummarySchema,
	type Workspace,
	type WorkspaceEnv,
	type WorkspaceInfo,
	WorkspaceInfoSchema,
	type WorkspaceInvitation,
	WorkspaceInvitationSchema,
	type WorkspaceMember,
	WorkspaceMemberSchema,
	type WorkspaceRole,
	// Database enums
	WorkspaceRoleSchema,
	// Workspace types
	WorkspaceSchema,
	// Hono env types
	type WorkspaceVariables,
} from './api'
// Database types
export {
	type MessageMetadata,
	MessageMetadataSchema,
	type TokenUsage,
	TokenUsageSchema,
	type ToolCall,
	ToolCallSchema,
	type ToolResult,
	ToolResultSchema,
} from './db'
// Tool types
export { type ToolConfig, ToolConfigSchema, type ToolType, ToolTypeSchema } from './tool'
