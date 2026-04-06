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
	ApiKeyInfo,
	ApiSuccess,
	AuthSession,
	AuthUser,
	ChatMessage,
	ChatRequest,
	ChatStreamEvent,
	CloudflareEnv,
	CreateAgentInput,
	CreateScheduleInput,
	CreateToolInput,
	CreateWorkspaceInput,
	ExecutionResult,
	ExecutionStatus,
	InvitationStatus,
	MemberRole,
	MessageRole,
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
	WorkspaceInfo as WorkspaceInfoType,
	WorkspaceInvitation,
	WorkspaceMember,
	WorkspaceRole,
} from '@hare/types'
// Re-export type guards from @hare/types
export { isMessageRole, isWorkspaceRole } from '@hare/types'
// Re-export schemas (explicit to avoid conflicts with services)
export * from '../schemas'
// Main app
export { type App, app } from './app'
// Audit logging
export { type LogAuditInput, logAudit } from './audit'
// Client (Eden Treaty)
export {
	api,
	createApiClient,
	getWorkspaceId,
	setWorkspaceId,
} from './client'
// Context plugins
export {
	type AuthUserContext,
	adminPlugin,
	authPlugin,
	CloudflareEnvError,
	cfContext,
	getD1,
	getDbFromEnv,
	hasPermission,
	optionalAuthPlugin,
	ownerPlugin,
	type WorkspaceInfo,
	workspacePlugin,
	writePlugin,
} from './context'

// Note: Hono-specific helpers (accepts, cookie, permissions, responses, testing)
// were removed during the Elysia migration. Use Elysia's built-in equivalents.

// Re-export services (excluding MemoryMetadataSchema which conflicts with schemas)
export {
	type BillingUsageStats,
	type GetBillingUsageOptions,
	getActiveAgentCount,
	getMessageCount,
	getTokenUsage,
} from '../services/billing-usage'
export {
	executeHttpTool,
	HttpToolConfigSchema,
	type InputSchema,
	isUrlSafe,
} from '../services/custom-tool-executor'
export * from '../services/deployment'
export {
	DEFAULT_MEMORY_PAGE_SIZE,
	EMBEDDING_DIMENSIONS,
	EMBEDDING_MODEL,
	MAX_VECTORIZE_TOP_K,
} from '../services/vector-memory'
export {
	generateSignature,
	type TriggerWebhookOptions,
	verifySignature,
	type WebhookDeliveryResult,
	type WebhookPayload,
} from '../services/webhooks'
