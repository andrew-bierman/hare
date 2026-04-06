/**
 * @hare/api - Elysia API for Hare AI agents platform
 *
 * Built on Elysia with:
 * - Eden Treaty for end-to-end type-safe client
 * - Cloudflare Workers adapter
 * - Better Auth integration
 * - Zod schemas via Standard Schema
 *
 * @example
 * ```ts
 * import { app } from '@hare/api'
 *
 * // Use in Cloudflare Workers
 * export default app
 * ```
 */

// Main app
export { app, type App } from './app'

// Client (Eden Treaty)
export {
	api,
	createApiClient,
	getWorkspaceId,
	setWorkspaceId,
} from './client'

// Context plugins
export {
	adminPlugin,
	authPlugin,
	type AuthUserContext,
	cfContext,
	CloudflareEnvError,
	getD1,
	getDbFromEnv,
	hasPermission,
	optionalAuthPlugin,
	ownerPlugin,
	type WorkspaceInfo,
	workspacePlugin,
	writePlugin,
} from './context'

// Audit logging
export { logAudit, type LogAuditInput } from './audit'

// Re-export email service and templates from @hare/email
export {
	createEmailService,
	type EmailEnv,
	type EmailResult,
	EmailService,
	PasswordResetEmail,
	WorkspaceInvitationEmail,
} from '@hare/email'

// Re-export types from @hare/types (canonical source)
export type {
	Agent,
	AgentConfig,
	AgentStatus,
	AgentUsage,
	ApiError,
	ApiKeyEnv,
	ApiKeyInfo,
	ApiKeyVariables,
	ApiSuccess,
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
	WorkspaceInfo as WorkspaceInfoType,
	WorkspaceInvitation,
	WorkspaceMember,
	WorkspaceRole,
	WorkspaceVariables,
} from '@hare/types'

// Re-export type guards from @hare/types
export { isMessageRole, isWorkspaceRole } from '@hare/types'

// Re-export schemas
export * from '../schemas'

// Re-export helpers
export { acceptsJson, acceptsSSE } from '../helpers'

// Re-export services
export * from '../services'
