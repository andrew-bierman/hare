/**
 * Application Constants
 *
 * Centralized configuration values for UI, API, and core functionality.
 * Eliminates magic strings and numbers for better maintainability.
 */

// =============================================================================
// Router Timing
// =============================================================================

export const ROUTER_TIMING = {
	/** Minimum time to show pending UI before displaying content (ms) */
	PENDING_MIN_MS: 200,
	/** Time before pending UI is shown (ms) */
	PENDING_MS: 100,
} as const

// =============================================================================
// UI Timing
// =============================================================================

export const UI_TIMING = {
	/** Duration to show "Copied!" feedback message (ms) */
	CLIPBOARD_FEEDBACK_MS: 2000,
	/** Default HTTP timeout for form submissions (ms) */
	DEFAULT_FORM_TIMEOUT_MS: 10000,
} as const

// =============================================================================
// Display Truncation
// =============================================================================

export const DISPLAY_TRUNCATION = {
	/** Length for displaying truncated session IDs */
	SESSION_ID_LENGTH: 8,
	/** Length for displaying truncated tool IDs */
	TOOL_ID_LENGTH: 8,
	/** Maximum tools to show in preview before "and X more" */
	TOOLS_PREVIEW_LIMIT: 5,
	/** ISO date string slice length (YYYY-MM-DD) */
	DATE_ISO_LENGTH: 10,
	/** Random ID substring start index */
	RANDOM_ID_START: 2,
	/** Random ID substring end index */
	RANDOM_ID_END: 9,
} as const

// =============================================================================
// Validation Rules
// =============================================================================

export const VALIDATION = {
	/** Minimum password length */
	PASSWORD_MIN_LENGTH: 8,
	/** Token estimation: characters per 4 tokens */
	TOKEN_CHARS_PER_4: 4,
	/** Maximum filename length */
	FILENAME_MAX_LENGTH: 255,
	/** Maximum agent instructions length */
	AGENT_INSTRUCTIONS_MAX_LENGTH: 50000,
} as const

// =============================================================================
// Embed Widget Colors
// =============================================================================

export const EMBED_COLOR_PRESETS = [
	{ name: 'Indigo', value: '#6366f1' },
	{ name: 'Blue', value: '#3b82f6' },
	{ name: 'Emerald', value: '#10b981' },
	{ name: 'Rose', value: '#f43f5e' },
	{ name: 'Amber', value: '#f59e0b' },
	{ name: 'Purple', value: '#a855f7' },
	{ name: 'Slate', value: '#475569' },
	{ name: 'Black', value: '#18181b' },
] as const

export const EMBED_COLORS = {
	/** Default primary color for embed widget */
	DEFAULT_PRIMARY: '#6366f1',
	/** Dark theme background */
	DARK_BG: '#1a1a1a',
	/** Light theme background */
	LIGHT_BG: '#ffffff',
	/** Dark theme border */
	DARK_BORDER: '#333',
	/** Light theme border */
	LIGHT_BORDER: '#e5e5e5',
	/** Dark theme secondary background */
	DARK_SECONDARY_BG: '#222',
	/** Light theme secondary background */
	LIGHT_SECONDARY_BG: '#fafafa',
	/** Dark theme input background */
	DARK_INPUT_BG: '#222',
	/** Light theme input background */
	LIGHT_INPUT_BG: '#f5f5f5',
	/** Dark theme input border */
	DARK_INPUT_BORDER: '#444',
	/** Light theme input border */
	LIGHT_INPUT_BORDER: '#e0e0e0',
	/** Dark theme text color */
	DARK_TEXT: '#888',
	/** Light theme text color */
	LIGHT_TEXT: '#666',
	/** Dark theme light text */
	DARK_TEXT_LIGHT: '#ccc',
	/** Dark theme message bubble background */
	DARK_MESSAGE_BG: '#333',
	/** Light theme message bubble background */
	LIGHT_MESSAGE_BG: '#f0f0f0',
	/** Dark theme assistant bubble background */
	DARK_ASSISTANT_BG: '#333',
	/** Light theme assistant bubble background */
	LIGHT_ASSISTANT_BG: '#e5e5e5',
	/** Error background color */
	ERROR_BG: '#fee2e2',
	/** Error text color */
	ERROR_TEXT: '#dc2626',
	/** Powered by text color - dark theme */
	DARK_FOOTER_TEXT: '#666',
	/** Powered by text color - light theme */
	LIGHT_FOOTER_TEXT: '#999',
} as const

// =============================================================================
// Embed Widget Positions
// =============================================================================

export const EMBED_POSITIONS = [
	{ label: 'Bottom Right', value: 'bottom-right' },
	{ label: 'Bottom Left', value: 'bottom-left' },
	{ label: 'Top Right', value: 'top-right' },
	{ label: 'Top Left', value: 'top-left' },
] as const

// =============================================================================
// Widget Message Types
// =============================================================================

export const WIDGET_MESSAGE_TYPES = {
	/** Widget is ready */
	READY: 'hare:widget:ready',
	/** Close widget request */
	CLOSE: 'hare:widget:close',
	/** Send message command */
	SEND: 'hare:widget:send',
	/** Toggle widget visibility */
	TOGGLE: 'hare:widget:toggle',
} as const

// =============================================================================
// Chat Stream Event Types
// =============================================================================

export const CHAT_STREAM_TYPES = {
	/** Text content chunk */
	TEXT: 'text',
	/** Stream complete */
	DONE: 'done',
	/** Error occurred */
	ERROR: 'error',
} as const

export type ChatStreamType = (typeof CHAT_STREAM_TYPES)[keyof typeof CHAT_STREAM_TYPES]

// =============================================================================
// HTTP Status Codes
// =============================================================================

export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
} as const

// =============================================================================
// Cookie Configuration
// =============================================================================

export const COOKIE_CONFIG = {
	/** Session cookie expiry in seconds (7 days) */
	SESSION_EXPIRY_SECONDS: 60 * 60 * 24 * 7,
	/** Workspace cookie expiry in seconds (30 days) */
	WORKSPACE_EXPIRY_SECONDS: 60 * 60 * 24 * 30,
	/** Default cookie path */
	DEFAULT_PATH: '/',
} as const

// =============================================================================
// Cookie Names
// =============================================================================

export const COOKIE_NAMES = {
	/** Session cookie name */
	SESSION: 'hare_session',
	/** User preferences cookie */
	PREFERENCES: 'hare_prefs',
	/** Theme preference */
	THEME: 'hare_theme',
	/** Workspace context */
	WORKSPACE: 'hare_workspace',
} as const

// =============================================================================
// Logging Configuration
// =============================================================================

export const LOGGING_CONFIG = {
	/** KV key prefix for request logs */
	KEY_PREFIX: 'request_log:',
	/** Maximum logs to keep in memory before flushing */
	BATCH_SIZE: 100,
	/** TTL for logs in KV (7 days in seconds) */
	TTL_SECONDS: 7 * 24 * 60 * 60,
	/** Default log query limit */
	DEFAULT_LIMIT: 50,
	/** Maximum log query limit */
	MAX_LIMIT: 100,
	/** Maximum logs to fetch for stats */
	STATS_LIMIT: 1000,
} as const

// =============================================================================
// Encryption Configuration
// =============================================================================

export const ENCRYPTION_CONFIG = {
	/** PBKDF2 iterations for key derivation */
	PBKDF2_ITERATIONS: 100000,
	/** IV size for AES-GCM (bytes) */
	IV_SIZE: 12,
	/** Salt size for key derivation (bytes) */
	SALT_SIZE: 16,
	/** AES key length (bits) */
	AES_KEY_LENGTH: 256,
	/** Default secret length for generateSecret */
	DEFAULT_SECRET_LENGTH: 32,
} as const

// =============================================================================
// API Key Configuration
// =============================================================================

export const API_KEY_CONFIG = {
	/** API key prefix */
	PREFIX: 'hare_',
	/** API key prefix display length */
	PREFIX_DISPLAY_LENGTH: 12,
	/** Random bytes for API key generation */
	RANDOM_BYTES: 32,
} as const

// =============================================================================
// Tool Configuration
// =============================================================================

/** Prefix for system-provided tool IDs (vs. user-created custom tools) */
export const SYSTEM_TOOL_ID_PREFIX = 'system-'

/**
 * Check if a tool ID belongs to a system (built-in) tool.
 */
export function isSystemToolId(toolId: string): boolean {
	return toolId.startsWith(SYSTEM_TOOL_ID_PREFIX)
}

// =============================================================================
// Currency
// =============================================================================

export const CURRENCY = {
	/** Divisor to convert integer cents to decimal dollars */
	CENTS_PER_DOLLAR: 100,
} as const

// =============================================================================
// Chat Configuration
// =============================================================================

export const CHAT_CONFIG = {
	/** Default limit for loading conversation history */
	HISTORY_LIMIT: 20,
	/** Search highlight context window (chars on each side of match) */
	HIGHLIGHT_CONTEXT_CHARS: 100,
} as const

// =============================================================================
// Agent Health
// =============================================================================

export const AGENT_HEALTH = {
	/** Minimum success rate percentage to be considered healthy */
	HEALTHY_MIN_SUCCESS_RATE: 95,
	/** Minimum success rate percentage before marked degraded */
	DEGRADED_MIN_SUCCESS_RATE: 80,
	/** Health metrics window in milliseconds (24 hours) */
	WINDOW_MS: 24 * 60 * 60 * 1000,
} as const

// =============================================================================
// CORS / Security
// =============================================================================

export const CORS_CONFIG = {
	/** Preflight cache duration in seconds (24 hours) */
	MAX_AGE_SECONDS: 86400,
} as const

export const SECURITY_HEADERS = {
	/** HSTS max-age in seconds (1 year) */
	HSTS_MAX_AGE_SECONDS: 60 * 60 * 24 * 365,
} as const

// =============================================================================
// HTTP Auth
// =============================================================================

export const HTTP_AUTH = {
	/** Bearer token prefix */
	BEARER_PREFIX: 'Bearer ',
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type EmbedColorPreset = (typeof EMBED_COLOR_PRESETS)[number]
export type EmbedPosition = (typeof EMBED_POSITIONS)[number]
export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES]
