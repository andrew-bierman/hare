/**
 * Unified Application Configuration
 *
 * Single source of truth for all application configuration.
 * Access via `config.section.value` for full type safety.
 *
 * This file composes the unified config from modular config files.
 */

// Import modular configs
import { APP_CONFIG, FEATURES, BETA_ACCESS } from './app'
import {
	AI_MODELS,
	DEFAULT_MODEL_ID,
	PROVIDER_LABELS,
	SPEED_TIER_LABELS,
	COST_TIER_LABELS,
	getModelById,
	getModelName,
	getModelsByProvider,
	getProviderLabel,
	type AIModel,
	type ModelProvider,
	type SpeedTier,
	type CostTier,
} from './models'
import {
	SYSTEM_TOOLS,
	AGENT_DEFAULTS,
	AGENT_LIMITS,
	getAvailableTools,
	type SystemTool,
	type SystemToolType,
} from './tools'
import {
	AGENT_TEMPLATES,
	RESPONSE_STYLE_PRESETS,
	getTemplateById,
	getResponseStyleById,
	getResponseStyleFromConfig,
	type AgentTemplate,
	type AgentTemplateId,
	type ResponseStylePreset,
	type ResponseStyle,
} from './templates'
import {
	AgentStatus,
	DeploymentStatus,
	ScheduleStatus,
	ExecutionStatus,
	InvitationStatus,
	WorkspaceRole,
	MemberRole,
	MessageRole,
	ScheduleType,
	ExportFormat,
	ValidationIssueSeverity,
	UsageGroupBy,
	ToolType,
	ToolCategory,
	HttpMethod,
	NodeEnv,
	PlanId,
	WidgetPosition,
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
	VALIDATION_ISSUE_SEVERITIES,
	USAGE_GROUP_BY_OPTIONS,
	TOOL_TYPES,
	HTTP_METHODS,
	NODE_ENVS,
	PLAN_IDS,
	WIDGET_POSITIONS,
	ENUM_DEFAULTS,
} from './enums'
import {
	ROUTER_TIMING,
	UI_TIMING,
	DISPLAY_TRUNCATION,
	VALIDATION,
	EMBED_COLOR_PRESETS,
	EMBED_COLORS,
	EMBED_POSITIONS,
	WIDGET_MESSAGE_TYPES,
	CHAT_STREAM_TYPES,
	HTTP_STATUS,
	COOKIE_CONFIG,
	COOKIE_NAMES,
	LOGGING_CONFIG,
	ENCRYPTION_CONFIG,
	API_KEY_CONFIG,
} from './constants'
import { NAV_ITEMS } from './navigation'
import {
	LANDING_PAGE,
	AUTH_CONTENT,
	DASHBOARD_CONTENT,
	DEV_TOOLS_CONTENT,
	UI_TEXT,
	ERROR_MESSAGES,
	DEV_CONFIG,
} from './content'

// =============================================================================
// Unified Configuration Object
// =============================================================================

export const config = {
	// App Metadata & Branding
	app: APP_CONFIG,

	// Feature Flags
	features: FEATURES,

	// Beta Access
	beta: BETA_ACCESS,

	// AI Models
	models: {
		defaultId: DEFAULT_MODEL_ID,
		list: AI_MODELS,
		labels: {
			provider: PROVIDER_LABELS,
			speed: SPEED_TIER_LABELS,
			cost: COST_TIER_LABELS,
		},
	},

	// Agents Configuration
	agents: {
		defaults: AGENT_DEFAULTS,
		limits: AGENT_LIMITS,
		templates: AGENT_TEMPLATES,
		responseStyles: RESPONSE_STYLE_PRESETS,
	},

	// System Tools
	tools: {
		system: SYSTEM_TOOLS,
	},

	// Enums (Status, Role, Type values)
	enums: {
		agentStatus: AgentStatus,
		deploymentStatus: DeploymentStatus,
		scheduleStatus: ScheduleStatus,
		executionStatus: ExecutionStatus,
		invitationStatus: InvitationStatus,
		workspaceRole: WorkspaceRole,
		memberRole: MemberRole,
		messageRole: MessageRole,
		scheduleType: ScheduleType,
		exportFormat: ExportFormat,
		validationSeverity: ValidationIssueSeverity,
		usageGroupBy: UsageGroupBy,
		httpMethod: HttpMethod,
		nodeEnv: NodeEnv,
		planId: PlanId,
		widgetPosition: WidgetPosition,
		toolType: ToolType,
		toolCategory: ToolCategory,
	},

	// UI Configuration
	ui: {
		timing: {
			router: { pendingMinMs: ROUTER_TIMING.PENDING_MIN_MS, pendingMs: ROUTER_TIMING.PENDING_MS },
			clipboardFeedbackMs: UI_TIMING.CLIPBOARD_FEEDBACK_MS,
			formTimeoutMs: UI_TIMING.DEFAULT_FORM_TIMEOUT_MS,
		},
		display: {
			truncation: {
				sessionIdLength: DISPLAY_TRUNCATION.SESSION_ID_LENGTH,
				toolIdLength: DISPLAY_TRUNCATION.TOOL_ID_LENGTH,
				toolsPreviewLimit: DISPLAY_TRUNCATION.TOOLS_PREVIEW_LIMIT,
				dateIsoLength: DISPLAY_TRUNCATION.DATE_ISO_LENGTH,
				randomIdStart: DISPLAY_TRUNCATION.RANDOM_ID_START,
				randomIdEnd: DISPLAY_TRUNCATION.RANDOM_ID_END,
			},
		},
		embed: {
			colorPresets: EMBED_COLOR_PRESETS,
			colors: {
				defaultPrimary: EMBED_COLORS.DEFAULT_PRIMARY,
				dark: {
					bg: EMBED_COLORS.DARK_BG,
					border: EMBED_COLORS.DARK_BORDER,
					secondaryBg: EMBED_COLORS.DARK_SECONDARY_BG,
					inputBg: EMBED_COLORS.DARK_INPUT_BG,
					inputBorder: EMBED_COLORS.DARK_INPUT_BORDER,
					text: EMBED_COLORS.DARK_TEXT,
					textLight: EMBED_COLORS.DARK_TEXT_LIGHT,
					messageBg: EMBED_COLORS.DARK_MESSAGE_BG,
					assistantBg: EMBED_COLORS.DARK_ASSISTANT_BG,
					footerText: EMBED_COLORS.DARK_FOOTER_TEXT,
				},
				light: {
					bg: EMBED_COLORS.LIGHT_BG,
					border: EMBED_COLORS.LIGHT_BORDER,
					secondaryBg: EMBED_COLORS.LIGHT_SECONDARY_BG,
					inputBg: EMBED_COLORS.LIGHT_INPUT_BG,
					inputBorder: EMBED_COLORS.LIGHT_INPUT_BORDER,
					text: EMBED_COLORS.LIGHT_TEXT,
					messageBg: EMBED_COLORS.LIGHT_MESSAGE_BG,
					assistantBg: EMBED_COLORS.LIGHT_ASSISTANT_BG,
					footerText: EMBED_COLORS.LIGHT_FOOTER_TEXT,
				},
				error: { bg: EMBED_COLORS.ERROR_BG, text: EMBED_COLORS.ERROR_TEXT },
			},
			positions: EMBED_POSITIONS,
		},
		text: UI_TEXT,
	},

	// Validation Rules
	validation: {
		passwordMinLength: VALIDATION.PASSWORD_MIN_LENGTH,
		tokenCharsPer4: VALIDATION.TOKEN_CHARS_PER_4,
		filenameMaxLength: VALIDATION.FILENAME_MAX_LENGTH,
		agentInstructionsMaxLength: VALIDATION.AGENT_INSTRUCTIONS_MAX_LENGTH,
	},

	// HTTP Configuration
	http: {
		status: HTTP_STATUS,
		chatStream: CHAT_STREAM_TYPES,
		widget: WIDGET_MESSAGE_TYPES,
	},

	// Cookies Configuration
	cookies: {
		names: COOKIE_NAMES,
		config: {
			sessionExpirySeconds: COOKIE_CONFIG.SESSION_EXPIRY_SECONDS,
			workspaceExpirySeconds: COOKIE_CONFIG.WORKSPACE_EXPIRY_SECONDS,
			defaultPath: COOKIE_CONFIG.DEFAULT_PATH,
		},
	},

	// Security Configuration
	security: {
		encryption: {
			pbkdf2Iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
			ivSize: ENCRYPTION_CONFIG.IV_SIZE,
			saltSize: ENCRYPTION_CONFIG.SALT_SIZE,
			aesKeyLength: ENCRYPTION_CONFIG.AES_KEY_LENGTH,
			defaultSecretLength: ENCRYPTION_CONFIG.DEFAULT_SECRET_LENGTH,
		},
		apiKey: {
			prefix: API_KEY_CONFIG.PREFIX,
			prefixDisplayLength: API_KEY_CONFIG.PREFIX_DISPLAY_LENGTH,
			randomBytes: API_KEY_CONFIG.RANDOM_BYTES,
		},
	},

	// Logging Configuration
	logging: {
		keyPrefix: LOGGING_CONFIG.KEY_PREFIX,
		batchSize: LOGGING_CONFIG.BATCH_SIZE,
		ttlSeconds: LOGGING_CONFIG.TTL_SECONDS,
		defaultLimit: LOGGING_CONFIG.DEFAULT_LIMIT,
		maxLimit: LOGGING_CONFIG.MAX_LIMIT,
		statsLimit: LOGGING_CONFIG.STATS_LIMIT,
	},

	// Navigation
	navigation: NAV_ITEMS,

	// Content
	content: {
		landing: LANDING_PAGE,
		auth: AUTH_CONTENT,
		dashboard: DASHBOARD_CONTENT,
		errors: ERROR_MESSAGES,
		devTools: {
			...DEV_TOOLS_CONTENT,
			...DEV_CONFIG,
		},
	},

	// Defaults (commonly used default values)
	defaults: ENUM_DEFAULTS,
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type Config = typeof config
export type AppConfig = typeof config.app
export type Features = typeof config.features
export type ModelsConfig = typeof config.models
export type AgentsConfig = typeof config.agents
export type ToolsConfig = typeof config.tools
export type EnumsConfig = typeof config.enums
export type UIConfig = typeof config.ui
export type ContentConfig = typeof config.content
export type NavigationConfig = typeof config.navigation

// Enum value types (re-export from enums.ts)
export type {
	AgentStatus,
	DeploymentStatus,
	ScheduleStatus,
	ExecutionStatus,
	InvitationStatus,
	WorkspaceRole,
	MemberRole,
	MessageRole,
	ScheduleType,
	ExportFormat,
	ToolType,
	ToolCategory,
	HttpMethod,
	NodeEnv,
	PlanId,
	WidgetPosition,
} from './enums'

// Re-export types from other modules
export type {
	AIModel,
	ModelProvider,
	SpeedTier,
	CostTier,
	SystemTool,
	SystemToolType,
	AgentTemplate,
	AgentTemplateId,
	ResponseStylePreset,
	ResponseStyle,
}

// =============================================================================
// Helper Functions (re-export)
// =============================================================================

export {
	getModelById,
	getModelName,
	getModelsByProvider,
	getProviderLabel,
	getAvailableTools,
	getTemplateById,
	getResponseStyleById,
	getResponseStyleFromConfig,
}

// =============================================================================
// Enum Arrays for Schema Validation (re-export)
// =============================================================================

export {
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
}

export function getModelsByProvider(): Map<ModelProvider, AIModel[]> {
	const grouped = new Map<ModelProvider, AIModel[]>()
	for (const model of config.models.list) {
		const existing = grouped.get(model.provider) ?? []
		grouped.set(model.provider, [...existing, model])
	}
	return grouped
}

export function getProviderLabel(provider: ModelProvider): string {
	return config.models.labels.provider[provider]
}

export function getAvailableTools(): SystemTool[] {
	return config.tools.system.filter((t) => t.available)
}

export function getTemplateById(id: string): AgentTemplate | undefined {
	return config.agents.templates.find((t) => t.id === id)
}

export function getResponseStyleById(id: ResponseStyle): ResponseStylePreset | undefined {
	return config.agents.responseStyles.find((s) => s.id === id)
}

export function getResponseStyleFromConfig(temperature: number): ResponseStyle {
	if (temperature <= 0.4) return 'precise'
	if (temperature <= 0.8) return 'balanced'
	return 'creative'
}

// Helper type to extract values as a tuple from an object with `as const`
type ObjectValues<T> = T extends Record<string, infer V> ? V : never
type EnumTuple<T extends Record<string, string>> = [ObjectValues<T>, ...ObjectValues<T>[]]

// Type-safe helper to convert enum object to tuple (for drizzle schema)
function enumToTuple<T extends Record<string, string>>(obj: T): EnumTuple<T> {
	return Object.values(obj) as EnumTuple<T>
}

// Tool type arrays for schema validation (typed as tuples for drizzle compatibility)
export const TOOL_TYPES = enumToTuple(config.enums.toolType)
export const AGENT_STATUSES = enumToTuple(config.enums.agentStatus)
export const DEPLOYMENT_STATUSES = enumToTuple(config.enums.deploymentStatus)
export const SCHEDULE_STATUSES = enumToTuple(config.enums.scheduleStatus)
export const EXECUTION_STATUSES = enumToTuple(config.enums.executionStatus)
export const INVITATION_STATUSES = enumToTuple(config.enums.invitationStatus)
export const WORKSPACE_ROLES = enumToTuple(config.enums.workspaceRole)
export const MEMBER_ROLES = enumToTuple(config.enums.memberRole)
export const MESSAGE_ROLES = enumToTuple(config.enums.messageRole)
export const SCHEDULE_TYPES = enumToTuple(config.enums.scheduleType)
export const EXPORT_FORMATS = enumToTuple(config.enums.exportFormat)
export const USAGE_GROUP_BY_OPTIONS = enumToTuple(config.enums.usageGroupBy)
export const VALIDATION_ISSUE_SEVERITIES = enumToTuple(config.enums.validationSeverity)
export const HTTP_METHODS = enumToTuple(config.enums.httpMethod)
export const NODE_ENVS = enumToTuple(config.enums.nodeEnv)
export const PLAN_IDS = enumToTuple(config.enums.planId)
export const WIDGET_POSITIONS = enumToTuple(config.enums.widgetPosition)

// API message roles (excludes tool)
export const API_MESSAGE_ROLES = [
	config.enums.messageRole.USER,
	config.enums.messageRole.ASSISTANT,
	config.enums.messageRole.SYSTEM,
] as const
