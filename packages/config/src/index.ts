/**
 * Shared Configuration
 *
 * Central export point for all application configuration.
 * Following Feature-Sliced Design, this is the public API for the config segment.
 */

// Environment
export { clientEnv, serverEnv, type ClientEnv, type ServerEnv } from './env'

// App Configuration
export { APP_CONFIG, BETA_ACCESS, FEATURES, type AppConfig, type BetaAccess, type Features } from './app'

// AI Models
export {
	AI_MODELS,
	AVAILABLE_MODELS,
	DEFAULT_MODEL_ID,
	getModelById,
	getModelName,
	type AIModel,
	type ModelProvider,
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
