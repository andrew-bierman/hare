/**
 * Shared Configuration
 *
 * Single unified Config object for all application configuration.
 * Access via `config.section.value` for full type safety.
 *
 * @example
 * ```ts
 * import { config } from '@hare/config'
 *
 * // Access configuration
 * config.app.name // 'Hare'
 * config.models.defaultId // 'claude-3-5-sonnet-20241022'
 * config.enums.agentStatus.DRAFT // 'draft'
 *
 * // Use enum arrays for schema validation
 * z.enum(AGENT_STATUSES)
 * ```
 */

export {
	// Main config object
	config,
	// Helper functions
	getModelById,
	getModelName,
	getModelsByProvider,
	getProviderLabel,
	getAvailableTools,
	getTemplateById,
	getResponseStyleById,
	getResponseStyleFromConfig,
	// Enum arrays for Zod schema validation
	TOOL_TYPES,
	AGENT_STATUSES,
	DEPLOYMENT_STATUSES,
	SCHEDULE_STATUSES,
	EXECUTION_STATUSES,
	INVITATION_STATUSES,
	WORKSPACE_ROLES,
	MEMBER_ROLES,
	MESSAGE_ROLES,
	API_MESSAGE_ROLES,
	SCHEDULE_TYPES,
	EXPORT_FORMATS,
	USAGE_GROUP_BY_OPTIONS,
	VALIDATION_ISSUE_SEVERITIES,
	HTTP_METHODS,
	NODE_ENVS,
	PLAN_IDS,
	WIDGET_POSITIONS,
	AUDIT_ACTIONS,
	ACTIVITY_EVENT_TYPES,
	// Types
	type config as ConfigType,
	type AppConfig,
	type Features,
	type ModelsConfig,
	type AgentsConfig,
	type ToolsConfig,
	type EnumsConfig,
	type UIConfig,
	type ContentConfig,
	type NavigationConfig,
	type AIModel,
	type SystemTool,
	type ResponseStylePreset,
	type AgentTemplate,
	type ModelProvider,
	type SpeedTier,
	type CostTier,
	type ResponseStyle,
	type SystemToolType,
	type AgentTemplateId,
	type AgentStatus,
	type DeploymentStatus,
	type ScheduleStatus,
	type ExecutionStatus,
	type InvitationStatus,
	type WorkspaceRole,
	type MemberRole,
	type MessageRole,
	type ScheduleType,
	type ExportFormat,
	type ToolType,
	type ToolCategory,
	type HttpMethod,
	type NodeEnv,
	type PlanId,
	type WidgetPosition,
	type AuditAction,
	type ActivityEventType,
} from './config'

// Environment (separate due to runtime dynamic values)
export { clientEnv, serverEnv, type ClientEnv, type ServerEnv } from './env'
