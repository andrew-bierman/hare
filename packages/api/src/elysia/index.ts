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
	EMBEDDING_MODEL,
	EMBEDDING_DIMENSIONS,
	MAX_VECTORIZE_TOP_K,
	DEFAULT_MEMORY_PAGE_SIZE,
} from '../services/vector-memory'
export {
	type TriggerWebhookOptions,
	type WebhookDeliveryResult,
	type WebhookPayload,
	generateSignature,
	verifySignature,
} from '../services/webhooks'
