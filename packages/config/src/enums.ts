/**
 * Centralized Enums
 *
 * Single source of truth for all enum values used across the application.
 * Eliminates magic strings and ensures consistency between API, DB, and UI.
 */

// =============================================================================
// Status Enums
// =============================================================================

/**
 * Agent lifecycle status
 */
export const AgentStatus = {
	DRAFT: 'draft',
	DEPLOYED: 'deployed',
	ARCHIVED: 'archived',
} as const

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus]

export const AGENT_STATUSES = [
	AgentStatus.DRAFT,
	AgentStatus.DEPLOYED,
	AgentStatus.ARCHIVED,
] as const

/**
 * Deployment status
 */
export const DeploymentStatus = {
	DEPLOYED: 'deployed',
	ACTIVE: 'active',
	PENDING: 'pending',
	FAILED: 'failed',
	INACTIVE: 'inactive',
	ROLLED_BACK: 'rolled_back',
} as const

export type DeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus]

export const DEPLOYMENT_STATUSES = [
	DeploymentStatus.DEPLOYED,
	DeploymentStatus.ACTIVE,
	DeploymentStatus.PENDING,
	DeploymentStatus.FAILED,
	DeploymentStatus.INACTIVE,
	DeploymentStatus.ROLLED_BACK,
] as const

/**
 * Scheduled task status
 */
export const ScheduleStatus = {
	PENDING: 'pending',
	ACTIVE: 'active',
	PAUSED: 'paused',
	COMPLETED: 'completed',
	CANCELLED: 'cancelled',
} as const

export type ScheduleStatus = (typeof ScheduleStatus)[keyof typeof ScheduleStatus]

export const SCHEDULE_STATUSES = [
	ScheduleStatus.PENDING,
	ScheduleStatus.ACTIVE,
	ScheduleStatus.PAUSED,
	ScheduleStatus.COMPLETED,
	ScheduleStatus.CANCELLED,
] as const

/**
 * Schedule execution status
 */
export const ExecutionStatus = {
	RUNNING: 'running',
	COMPLETED: 'completed',
	FAILED: 'failed',
} as const

export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus]

export const EXECUTION_STATUSES = [
	ExecutionStatus.RUNNING,
	ExecutionStatus.COMPLETED,
	ExecutionStatus.FAILED,
] as const

/**
 * Workspace invitation status
 */
export const InvitationStatus = {
	PENDING: 'pending',
	ACCEPTED: 'accepted',
	EXPIRED: 'expired',
	REVOKED: 'revoked',
} as const

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus]

export const INVITATION_STATUSES = [
	InvitationStatus.PENDING,
	InvitationStatus.ACCEPTED,
	InvitationStatus.EXPIRED,
	InvitationStatus.REVOKED,
] as const

// =============================================================================
// Role Enums
// =============================================================================

/**
 * Workspace member roles (includes owner)
 */
export const WorkspaceRole = {
	OWNER: 'owner',
	ADMIN: 'admin',
	MEMBER: 'member',
	VIEWER: 'viewer',
} as const

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole]

export const WORKSPACE_ROLES = [
	WorkspaceRole.OWNER,
	WorkspaceRole.ADMIN,
	WorkspaceRole.MEMBER,
	WorkspaceRole.VIEWER,
] as const

/**
 * Assignable member roles (excludes owner - used for invitations and role updates)
 */
export const MemberRole = {
	ADMIN: 'admin',
	MEMBER: 'member',
	VIEWER: 'viewer',
} as const

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole]

export const MEMBER_ROLES = [MemberRole.ADMIN, MemberRole.MEMBER, MemberRole.VIEWER] as const

/**
 * Chat message roles
 */
export const MessageRole = {
	USER: 'user',
	ASSISTANT: 'assistant',
	SYSTEM: 'system',
	TOOL: 'tool',
} as const

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole]

export const MESSAGE_ROLES = [
	MessageRole.USER,
	MessageRole.ASSISTANT,
	MessageRole.SYSTEM,
	MessageRole.TOOL,
] as const

/**
 * API-facing message roles (excludes tool for public API)
 */
export const API_MESSAGE_ROLES = [
	MessageRole.USER,
	MessageRole.ASSISTANT,
	MessageRole.SYSTEM,
] as const

// =============================================================================
// Type Enums
// =============================================================================

/**
 * Schedule type
 */
export const ScheduleType = {
	ONE_TIME: 'one-time',
	RECURRING: 'recurring',
} as const

export type ScheduleType = (typeof ScheduleType)[keyof typeof ScheduleType]

export const SCHEDULE_TYPES = [ScheduleType.ONE_TIME, ScheduleType.RECURRING] as const

/**
 * Conversation export format
 */
export const ExportFormat = {
	JSON: 'json',
	CSV: 'csv',
	TXT: 'txt',
} as const

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat]

export const EXPORT_FORMATS = [ExportFormat.JSON, ExportFormat.CSV, ExportFormat.TXT] as const

/**
 * Validation issue severity
 */
export const ValidationIssueSeverity = {
	ERROR: 'error',
	WARNING: 'warning',
} as const

export type ValidationIssueSeverity =
	(typeof ValidationIssueSeverity)[keyof typeof ValidationIssueSeverity]

export const VALIDATION_ISSUE_SEVERITIES = [
	ValidationIssueSeverity.ERROR,
	ValidationIssueSeverity.WARNING,
] as const

/**
 * Usage grouping period
 */
export const UsageGroupBy = {
	DAY: 'day',
	WEEK: 'week',
	MONTH: 'month',
} as const

export type UsageGroupBy = (typeof UsageGroupBy)[keyof typeof UsageGroupBy]

export const USAGE_GROUP_BY_OPTIONS = [
	UsageGroupBy.DAY,
	UsageGroupBy.WEEK,
	UsageGroupBy.MONTH,
] as const

// =============================================================================
// Tool Types
// =============================================================================

/**
 * Tool categories for organization
 */
export const ToolCategory = {
	CLOUDFLARE: 'cloudflare',
	UTILITY: 'utility',
	INTEGRATIONS: 'integrations',
	AI: 'ai',
	DATA: 'data',
	SANDBOX: 'sandbox',
	VALIDATION: 'validation',
	TRANSFORM: 'transform',
	CUSTOM: 'custom',
} as const

export type ToolCategory = (typeof ToolCategory)[keyof typeof ToolCategory]

/**
 * All supported tool types with category mapping
 */
export const ToolType = {
	// Cloudflare native
	HTTP: 'http',
	SQL: 'sql',
	KV: 'kv',
	R2: 'r2',
	SEARCH: 'search',
	// Utility
	DATETIME: 'datetime',
	JSON: 'json',
	TEXT: 'text',
	MATH: 'math',
	UUID: 'uuid',
	HASH: 'hash',
	BASE64: 'base64',
	URL: 'url',
	DELAY: 'delay',
	// Integrations
	ZAPIER: 'zapier',
	WEBHOOK: 'webhook',
	SLACK: 'slack',
	DISCORD: 'discord',
	EMAIL: 'email',
	TEAMS: 'teams',
	TWILIO_SMS: 'twilio_sms',
	MAKE: 'make',
	N8N: 'n8n',
	// AI
	SENTIMENT: 'sentiment',
	SUMMARIZE: 'summarize',
	TRANSLATE: 'translate',
	IMAGE_GENERATE: 'image_generate',
	CLASSIFY: 'classify',
	NER: 'ner',
	EMBEDDING: 'embedding',
	QUESTION_ANSWER: 'question_answer',
	// Data
	RSS: 'rss',
	SCRAPE: 'scrape',
	REGEX: 'regex',
	CRYPTO: 'crypto',
	JSON_SCHEMA: 'json_schema',
	CSV: 'csv',
	TEMPLATE: 'template',
	// Sandbox
	CODE_EXECUTE: 'code_execute',
	CODE_VALIDATE: 'code_validate',
	SANDBOX_FILE: 'sandbox_file',
	// Validation
	VALIDATE_EMAIL: 'validate_email',
	VALIDATE_PHONE: 'validate_phone',
	VALIDATE_URL: 'validate_url',
	VALIDATE_CREDIT_CARD: 'validate_credit_card',
	VALIDATE_IP: 'validate_ip',
	VALIDATE_JSON: 'validate_json',
	// Transform
	MARKDOWN: 'markdown',
	DIFF: 'diff',
	QRCODE: 'qrcode',
	COMPRESSION: 'compression',
	COLOR: 'color',
	// Custom
	CUSTOM: 'custom',
} as const

export type ToolType = (typeof ToolType)[keyof typeof ToolType]

/**
 * All tool types as array for schema validation
 */
export const TOOL_TYPES = [
	// Cloudflare native
	ToolType.HTTP,
	ToolType.SQL,
	ToolType.KV,
	ToolType.R2,
	ToolType.SEARCH,
	// Utility
	ToolType.DATETIME,
	ToolType.JSON,
	ToolType.TEXT,
	ToolType.MATH,
	ToolType.UUID,
	ToolType.HASH,
	ToolType.BASE64,
	ToolType.URL,
	ToolType.DELAY,
	// Integrations
	ToolType.ZAPIER,
	ToolType.WEBHOOK,
	ToolType.SLACK,
	ToolType.DISCORD,
	ToolType.EMAIL,
	ToolType.TEAMS,
	ToolType.TWILIO_SMS,
	ToolType.MAKE,
	ToolType.N8N,
	// AI
	ToolType.SENTIMENT,
	ToolType.SUMMARIZE,
	ToolType.TRANSLATE,
	ToolType.IMAGE_GENERATE,
	ToolType.CLASSIFY,
	ToolType.NER,
	ToolType.EMBEDDING,
	ToolType.QUESTION_ANSWER,
	// Data
	ToolType.RSS,
	ToolType.SCRAPE,
	ToolType.REGEX,
	ToolType.CRYPTO,
	ToolType.JSON_SCHEMA,
	ToolType.CSV,
	ToolType.TEMPLATE,
	// Sandbox
	ToolType.CODE_EXECUTE,
	ToolType.CODE_VALIDATE,
	ToolType.SANDBOX_FILE,
	// Validation
	ToolType.VALIDATE_EMAIL,
	ToolType.VALIDATE_PHONE,
	ToolType.VALIDATE_URL,
	ToolType.VALIDATE_CREDIT_CARD,
	ToolType.VALIDATE_IP,
	ToolType.VALIDATE_JSON,
	// Transform
	ToolType.MARKDOWN,
	ToolType.DIFF,
	ToolType.QRCODE,
	ToolType.COMPRESSION,
	ToolType.COLOR,
	// Custom
	ToolType.CUSTOM,
] as const

/**
 * Tool type to category mapping
 */
export const TOOL_TYPE_CATEGORIES: Record<ToolType, ToolCategory> = {
	// Cloudflare native
	[ToolType.HTTP]: ToolCategory.CLOUDFLARE,
	[ToolType.SQL]: ToolCategory.CLOUDFLARE,
	[ToolType.KV]: ToolCategory.CLOUDFLARE,
	[ToolType.R2]: ToolCategory.CLOUDFLARE,
	[ToolType.SEARCH]: ToolCategory.CLOUDFLARE,
	// Utility
	[ToolType.DATETIME]: ToolCategory.UTILITY,
	[ToolType.JSON]: ToolCategory.UTILITY,
	[ToolType.TEXT]: ToolCategory.UTILITY,
	[ToolType.MATH]: ToolCategory.UTILITY,
	[ToolType.UUID]: ToolCategory.UTILITY,
	[ToolType.HASH]: ToolCategory.UTILITY,
	[ToolType.BASE64]: ToolCategory.UTILITY,
	[ToolType.URL]: ToolCategory.UTILITY,
	[ToolType.DELAY]: ToolCategory.UTILITY,
	// Integrations
	[ToolType.ZAPIER]: ToolCategory.INTEGRATIONS,
	[ToolType.WEBHOOK]: ToolCategory.INTEGRATIONS,
	[ToolType.SLACK]: ToolCategory.INTEGRATIONS,
	[ToolType.DISCORD]: ToolCategory.INTEGRATIONS,
	[ToolType.EMAIL]: ToolCategory.INTEGRATIONS,
	[ToolType.TEAMS]: ToolCategory.INTEGRATIONS,
	[ToolType.TWILIO_SMS]: ToolCategory.INTEGRATIONS,
	[ToolType.MAKE]: ToolCategory.INTEGRATIONS,
	[ToolType.N8N]: ToolCategory.INTEGRATIONS,
	// AI
	[ToolType.SENTIMENT]: ToolCategory.AI,
	[ToolType.SUMMARIZE]: ToolCategory.AI,
	[ToolType.TRANSLATE]: ToolCategory.AI,
	[ToolType.IMAGE_GENERATE]: ToolCategory.AI,
	[ToolType.CLASSIFY]: ToolCategory.AI,
	[ToolType.NER]: ToolCategory.AI,
	[ToolType.EMBEDDING]: ToolCategory.AI,
	[ToolType.QUESTION_ANSWER]: ToolCategory.AI,
	// Data
	[ToolType.RSS]: ToolCategory.DATA,
	[ToolType.SCRAPE]: ToolCategory.DATA,
	[ToolType.REGEX]: ToolCategory.DATA,
	[ToolType.CRYPTO]: ToolCategory.DATA,
	[ToolType.JSON_SCHEMA]: ToolCategory.DATA,
	[ToolType.CSV]: ToolCategory.DATA,
	[ToolType.TEMPLATE]: ToolCategory.DATA,
	// Sandbox
	[ToolType.CODE_EXECUTE]: ToolCategory.SANDBOX,
	[ToolType.CODE_VALIDATE]: ToolCategory.SANDBOX,
	[ToolType.SANDBOX_FILE]: ToolCategory.SANDBOX,
	// Validation
	[ToolType.VALIDATE_EMAIL]: ToolCategory.VALIDATION,
	[ToolType.VALIDATE_PHONE]: ToolCategory.VALIDATION,
	[ToolType.VALIDATE_URL]: ToolCategory.VALIDATION,
	[ToolType.VALIDATE_CREDIT_CARD]: ToolCategory.VALIDATION,
	[ToolType.VALIDATE_IP]: ToolCategory.VALIDATION,
	[ToolType.VALIDATE_JSON]: ToolCategory.VALIDATION,
	// Transform
	[ToolType.MARKDOWN]: ToolCategory.TRANSFORM,
	[ToolType.DIFF]: ToolCategory.TRANSFORM,
	[ToolType.QRCODE]: ToolCategory.TRANSFORM,
	[ToolType.COMPRESSION]: ToolCategory.TRANSFORM,
	[ToolType.COLOR]: ToolCategory.TRANSFORM,
	// Custom
	[ToolType.CUSTOM]: ToolCategory.CUSTOM,
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): ToolType[] {
	return TOOL_TYPES.filter((type) => TOOL_TYPE_CATEGORIES[type] === category)
}

// =============================================================================
// HTTP Methods
// =============================================================================

/**
 * HTTP request methods
 */
export const HttpMethod = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
	DELETE: 'DELETE',
	HEAD: 'HEAD',
	OPTIONS: 'OPTIONS',
} as const

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod]

export const HTTP_METHODS = [
	HttpMethod.GET,
	HttpMethod.POST,
	HttpMethod.PUT,
	HttpMethod.PATCH,
	HttpMethod.DELETE,
	HttpMethod.HEAD,
	HttpMethod.OPTIONS,
] as const

// =============================================================================
// Environment
// =============================================================================

/**
 * Node environment
 */
export const NodeEnv = {
	DEVELOPMENT: 'development',
	PRODUCTION: 'production',
	TEST: 'test',
} as const

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv]

export const NODE_ENVS = [NodeEnv.DEVELOPMENT, NodeEnv.PRODUCTION, NodeEnv.TEST] as const

// =============================================================================
// Billing
// =============================================================================

/**
 * Billing plan IDs
 */
export const PlanId = {
	FREE: 'free',
	PRO: 'pro',
	TEAM: 'team',
	ENTERPRISE: 'enterprise',
} as const

export type PlanId = (typeof PlanId)[keyof typeof PlanId]

export const PLAN_IDS = [PlanId.FREE, PlanId.PRO, PlanId.TEAM, PlanId.ENTERPRISE] as const

// =============================================================================
// Widget/Embed Configuration
// =============================================================================

/**
 * Widget position options
 */
export const WidgetPosition = {
	BOTTOM_RIGHT: 'bottom-right',
	BOTTOM_LEFT: 'bottom-left',
	TOP_RIGHT: 'top-right',
	TOP_LEFT: 'top-left',
} as const

export type WidgetPosition = (typeof WidgetPosition)[keyof typeof WidgetPosition]

export const WIDGET_POSITIONS = [
	WidgetPosition.BOTTOM_RIGHT,
	WidgetPosition.BOTTOM_LEFT,
	WidgetPosition.TOP_RIGHT,
	WidgetPosition.TOP_LEFT,
] as const

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default values for enums
 */
export const ENUM_DEFAULTS = {
	agentStatus: AgentStatus.DRAFT,
	scheduleStatus: ScheduleStatus.PENDING,
	invitationStatus: InvitationStatus.PENDING,
	workspaceRole: WorkspaceRole.MEMBER,
	memberRole: MemberRole.MEMBER,
	exportFormat: ExportFormat.JSON,
	planId: PlanId.FREE,
	widgetPosition: WidgetPosition.BOTTOM_RIGHT,
} as const
