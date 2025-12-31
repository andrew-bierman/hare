/**
 * Shared Configuration
 *
 * Central export point for all application configuration.
 * Following Feature-Sliced Design, this is the public API for the config segment.
 */

// Enums (centralized single source of truth)
export {
	// Status enums
	AgentStatus,
	AGENT_STATUSES,
	DeploymentStatus,
	DEPLOYMENT_STATUSES,
	ScheduleStatus,
	SCHEDULE_STATUSES,
	ExecutionStatus,
	EXECUTION_STATUSES,
	InvitationStatus,
	INVITATION_STATUSES,
	// Role enums
	WorkspaceRole,
	WORKSPACE_ROLES,
	MemberRole,
	MEMBER_ROLES,
	MessageRole,
	MESSAGE_ROLES,
	API_MESSAGE_ROLES,
	// Type enums
	ScheduleType,
	SCHEDULE_TYPES,
	ExportFormat,
	EXPORT_FORMATS,
	ValidationIssueSeverity,
	VALIDATION_ISSUE_SEVERITIES,
	UsageGroupBy,
	USAGE_GROUP_BY_OPTIONS,
	// Tool enums
	ToolCategory,
	ToolType,
	TOOL_TYPES,
	TOOL_TYPE_CATEGORIES,
	getToolsByCategory,
	// HTTP
	HttpMethod,
	HTTP_METHODS,
	// Environment
	NodeEnv,
	NODE_ENVS,
	// Billing
	PlanId,
	PLAN_IDS,
	// Widget
	WidgetPosition,
	WIDGET_POSITIONS,
	// Defaults
	ENUM_DEFAULTS,
	// Types
	type AgentStatus as AgentStatusType,
	type DeploymentStatus as DeploymentStatusType,
	type ScheduleStatus as ScheduleStatusType,
	type ExecutionStatus as ExecutionStatusType,
	type InvitationStatus as InvitationStatusType,
	type WorkspaceRole as WorkspaceRoleType,
	type MemberRole as MemberRoleType,
	type MessageRole as MessageRoleType,
	type ScheduleType as ScheduleTypeType,
	type ExportFormat as ExportFormatType,
	type ValidationIssueSeverity as ValidationIssueSeverityType,
	type UsageGroupBy as UsageGroupByType,
	type ToolCategory as ToolCategoryType,
	type ToolType as ToolTypeType,
	type HttpMethod as HttpMethodType,
	type NodeEnv as NodeEnvType,
	type PlanId as PlanIdType,
	type WidgetPosition as WidgetPositionType,
} from './enums'

// Environment
export { clientEnv, serverEnv, type ClientEnv, type ServerEnv } from './env'

// App Configuration
export { APP_CONFIG, BETA_ACCESS, FEATURES, type AppConfig, type BetaAccess, type Features } from './app'

// AI Models
export {
	AI_MODELS,
	COST_TIER_LABELS,
	DEFAULT_MODEL_ID,
	getModelById,
	getModelName,
	getModelsByProvider,
	getProviderLabel,
	PROVIDER_LABELS,
	SPEED_TIER_LABELS,
	type AIModel,
	type CostTier,
	type ModelProvider,
	type SpeedTier,
} from './models'

// Tools & Agents
export {
	AGENT_DEFAULTS,
	AGENT_LIMITS,
	getAvailableTools,
	SYSTEM_TOOLS,
	type AgentDefaults,
	type SystemTool,
	type SystemToolType,
} from './tools'

// Agent Templates & Response Styles
export {
	AGENT_TEMPLATES,
	getResponseStyleById,
	getResponseStyleFromConfig,
	getTemplateById,
	RESPONSE_STYLE_PRESETS,
	type AgentTemplate,
	type AgentTemplateId,
	type ResponseStyle,
	type ResponseStylePreset,
} from './templates'

// Navigation
export { NAV_ITEMS, type NavItems } from './navigation'

// Content
export {
	AUTH_CONTENT,
	DASHBOARD_CONTENT,
	DEV_CONFIG,
	DEV_TOOLS_CONTENT,
	ERROR_MESSAGES,
	LANDING_PAGE,
	UI_TEXT,
	type AuthContent,
	type DashboardContent,
	type DevConfig,
	type ErrorMessages,
	type LandingPage,
} from './content'

// Constants
export {
	API_KEY_CONFIG,
	CHAT_STREAM_TYPES,
	COOKIE_CONFIG,
	COOKIE_NAMES,
	DISPLAY_TRUNCATION,
	EMBED_COLOR_PRESETS,
	EMBED_COLORS,
	EMBED_POSITIONS,
	ENCRYPTION_CONFIG,
	HTTP_STATUS,
	LOGGING_CONFIG,
	ROUTER_TIMING,
	UI_TIMING,
	VALIDATION,
	WIDGET_MESSAGE_TYPES,
	type ChatStreamType,
	type CookieName,
	type EmbedColorPreset,
	type EmbedPosition,
} from './constants'
