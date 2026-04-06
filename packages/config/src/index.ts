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
	ACTIVITY_EVENT_TYPES,
	type ActivityEventType,
	AGENT_STATUSES,
	type AgentStatus,
	type AgentsConfig,
	type AgentTemplate,
	type AgentTemplateId,
	type AIModel,
	API_MESSAGE_ROLES,
	type AppConfig,
	AUDIT_ACTIONS,
	type AuditAction,
	type ContentConfig,
	type CostTier,
	// Main config object
	config,
	// Types
	type config as ConfigType,
	DEPLOYMENT_STATUSES,
	type DeploymentStatus,
	type EnumsConfig,
	EXECUTION_STATUSES,
	EXPORT_FORMATS,
	type ExecutionStatus,
	type ExportFormat,
	type Features,
	getAvailableTools,
	// Helper functions
	getModelById,
	getModelName,
	getModelsByProvider,
	getProviderLabel,
	getResponseStyleById,
	getResponseStyleFromConfig,
	getTemplateById,
	HTTP_METHODS,
	type HttpMethod,
	INVITATION_STATUSES,
	type InvitationStatus,
	MEMBER_ROLES,
	MESSAGE_ROLES,
	type MemberRole,
	type MessageRole,
	type ModelProvider,
	type ModelsConfig,
	type NavigationConfig,
	NODE_ENVS,
	type NodeEnv,
	PLAN_IDS,
	type PlanId,
	type ResponseStyle,
	type ResponseStylePreset,
	SCHEDULE_STATUSES,
	SCHEDULE_TYPES,
	type ScheduleStatus,
	type ScheduleType,
	type SpeedTier,
	type SystemTool,
	type SystemToolType,
	// Enum arrays for Zod schema validation
	TOOL_TYPES,
	type ToolCategory,
	type ToolsConfig,
	type ToolType,
	type UIConfig,
	USAGE_GROUP_BY_OPTIONS,
	VALIDATION_ISSUE_SEVERITIES,
	WIDGET_POSITIONS,
	type WidgetPosition,
	WORKSPACE_ROLES,
	WorkspaceRole,
} from './config'
// Environment (separate due to runtime dynamic values)
export { type ClientEnv, clientEnv, type ServerEnv, serverEnv } from './env'
// Instruction snippets / prompt library
export {
	getSnippetById,
	getSnippetsByCategory,
	INSTRUCTION_SNIPPETS,
	type InstructionSnippet,
	SNIPPET_CATEGORIES,
	type SnippetCategory,
} from './snippets'
