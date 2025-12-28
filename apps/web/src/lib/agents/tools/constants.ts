/**
 * Tool Constants
 *
 * Centralized configuration values for agent tools.
 * Eliminates magic strings and numbers for better maintainability.
 */

// ==========================================
// Timeouts (in milliseconds)
// ==========================================

export const Timeouts = {
	/** One hour in milliseconds */
	ONE_HOUR: 60 * 60 * 1000,
	/** Default HTTP request timeout */
	HTTP_DEFAULT: 30_000,
	/** Sandbox execution timeout */
	SANDBOX_DEFAULT: 30_000,
	/** Web scraping request timeout */
	SCRAPE_DEFAULT: 10_000,
	/** URL reachability check timeout */
	URL_REACHABILITY: 5_000,
	/** Zapier webhook timeout when waiting for response */
	ZAPIER_WAIT: 30_000,
	/** Zapier webhook timeout for fire-and-forget */
	ZAPIER_DEFAULT: 10_000,
	/** Default debounce delay */
	DEBOUNCE_DEFAULT: 500,
} as const

// ==========================================
// User Agent Strings
// ==========================================

export const UserAgents = {
	/** Default User-Agent for HTTP requests */
	DEFAULT: 'Hare-Agent/1.0',
	/** User-Agent for RSS feed requests */
	RSS: 'Hare-Agent/1.0 RSS Reader',
	/** User-Agent for web scraping */
	WEB_SCRAPE: 'Mozilla/5.0 (compatible; Hare-Agent/1.0; +https://hare.dev)',
} as const

// ==========================================
// Content Types
// ==========================================

export const ContentTypes = {
	JSON: 'application/json',
	XML: 'application/xml',
	HTML: 'text/html',
} as const

// ==========================================
// Storage Prefixes
// ==========================================

export const StoragePrefixes = {
	/** Workspace prefix for KV/R2 scoping */
	WORKSPACE: 'ws/',
	/** Zapier integration prefix in KV */
	ZAPIER: 'zapier',
} as const

// ==========================================
// Sandbox Configuration
// ==========================================

export const SandboxLimits = {
	/** Maximum code size in bytes (25KB) */
	MAX_CODE_SIZE_BYTES: 25_000,
	/** Maximum code executions per hour */
	MAX_EXECUTIONS_PER_HOUR: 50,
	/** Sandbox working directory */
	WORK_DIR: '/workspace',
} as const

// ==========================================
// List/Pagination Limits
// ==========================================

export const ListLimits = {
	/** Default limit for KV list operations */
	KV_DEFAULT: 100,
	/** Default limit for R2 list operations */
	R2_DEFAULT: 100,
	/** Default max search results */
	SEARCH_DEFAULT: 10,
	/** Default number of memory results */
	MEMORY_TOP_K: 5,
} as const

// ==========================================
// Content Length Limits
// ==========================================

export const ContentLengths = {
	/** Max text length for sentiment/classification */
	AI_SHORT: 5_000,
	/** Max text length for translation and NER */
	AI_MEDIUM: 10_000,
	/** Max content length for memory storage */
	MEMORY: 5_000,
	/** Max content length for web scraping */
	SCRAPE: 10_000,
} as const

// ==========================================
// Web Scraping Limits
// ==========================================

export const ScrapeLimits = {
	/** Maximum links to extract per page */
	MAX_LINKS_PER_PAGE: 100,
	/** Maximum images to extract per page */
	MAX_IMAGES_PER_PAGE: 50,
	/** Maximum selector results */
	MAX_SELECTOR_RESULTS: 20,
	/** Maximum images in final 'all' extraction */
	MAX_IMAGES_FINAL: 10,
	/** Maximum links in final 'all' extraction */
	MAX_LINKS_FINAL: 20,
} as const

// ==========================================
// Image Generation Parameters
// ==========================================

export const ImageGeneration = {
	/** Default image dimension */
	DEFAULT_SIZE: 512,
	/** Minimum image dimension */
	MIN_SIZE: 256,
	/** Maximum image dimension */
	MAX_SIZE: 1024,
	/** Default diffusion steps */
	DEFAULT_STEPS: 20,
	/** Minimum diffusion steps */
	MIN_STEPS: 1,
	/** Maximum diffusion steps */
	MAX_STEPS: 50,
	/** Default guidance scale */
	DEFAULT_GUIDANCE: 7.5,
	/** Minimum guidance scale */
	MIN_GUIDANCE: 1,
	/** Maximum guidance scale */
	MAX_GUIDANCE: 20,
} as const

// ==========================================
// Validation Limits
// ==========================================

export const ValidationLimits = {
	/** Maximum email local part length */
	EMAIL_LOCAL_PART_MAX: 64,
	/** Maximum email domain length */
	EMAIL_DOMAIN_MAX: 255,
	/** Minimum phone digits */
	PHONE_MIN_DIGITS: 7,
	/** Maximum phone digits */
	PHONE_MAX_DIGITS: 15,
} as const

// ==========================================
// Zapier Integration
// ==========================================

export const ZapierConfig = {
	/** Zapier webhook hostname for validation */
	WEBHOOK_HOSTNAME: 'hooks.zapier.com',
	/** Maximum integration name length */
	NAME_MAX_LENGTH: 50,
	/** Maximum description length */
	DESCRIPTION_MAX_LENGTH: 500,
} as const

// ==========================================
// AutoRAG Configuration
// ==========================================

export const AutoRAGConfig = {
	/** AutoRAG instance name */
	INSTANCE_NAME: 'hare-search',
} as const

// ==========================================
// Numeric Radixes
// ==========================================

export const Radix = {
	/** Decimal radix for parseInt */
	DECIMAL: 10,
	/** Hexadecimal radix for toString */
	HEX: 16,
} as const

// ==========================================
// Legacy exports for backwards compatibility
// ==========================================

// Timeouts
export const ONE_HOUR_MS = Timeouts.ONE_HOUR
export const HTTP_DEFAULT_TIMEOUT_MS = Timeouts.HTTP_DEFAULT
export const SANDBOX_DEFAULT_TIMEOUT_MS = Timeouts.SANDBOX_DEFAULT
export const SCRAPE_DEFAULT_TIMEOUT_MS = Timeouts.SCRAPE_DEFAULT
export const URL_REACHABILITY_TIMEOUT_MS = Timeouts.URL_REACHABILITY
export const ZAPIER_WAIT_TIMEOUT_MS = Timeouts.ZAPIER_WAIT
export const ZAPIER_DEFAULT_TIMEOUT_MS = Timeouts.ZAPIER_DEFAULT
export const DEFAULT_DEBOUNCE_DELAY_MS = Timeouts.DEBOUNCE_DEFAULT
export const AUTH_PROVIDER_CACHE_TTL_MS = Timeouts.ONE_HOUR

// User Agents
export const HTTP_USER_AGENT = UserAgents.DEFAULT
export const RSS_USER_AGENT = UserAgents.RSS
export const WEB_SCRAPE_USER_AGENT = UserAgents.WEB_SCRAPE

// Content Types
export const CONTENT_TYPE_JSON = ContentTypes.JSON

// Storage Prefixes
export const WORKSPACE_PREFIX = StoragePrefixes.WORKSPACE
export const ZAPIER_INTEGRATION_PREFIX = StoragePrefixes.ZAPIER

// Sandbox
export const SANDBOX_MAX_CODE_SIZE_BYTES = SandboxLimits.MAX_CODE_SIZE_BYTES
export const SANDBOX_MAX_EXECUTIONS_PER_HOUR = SandboxLimits.MAX_EXECUTIONS_PER_HOUR
export const SANDBOX_WORK_DIR = SandboxLimits.WORK_DIR

// List Limits
export const KV_LIST_DEFAULT_LIMIT = ListLimits.KV_DEFAULT
export const R2_LIST_DEFAULT_LIMIT = ListLimits.R2_DEFAULT
export const SEARCH_DEFAULT_MAX_RESULTS = ListLimits.SEARCH_DEFAULT
export const MEMORY_DEFAULT_TOP_K = ListLimits.MEMORY_TOP_K

// Content Lengths
export const AI_TEXT_MAX_LENGTH_SHORT = ContentLengths.AI_SHORT
export const AI_TEXT_MAX_LENGTH_MEDIUM = ContentLengths.AI_MEDIUM
export const MEMORY_CONTENT_MAX_LENGTH = ContentLengths.MEMORY
export const SCRAPE_MAX_CONTENT_LENGTH = ContentLengths.SCRAPE

// Scrape Limits
export const SCRAPE_MAX_LINKS_PER_PAGE = ScrapeLimits.MAX_LINKS_PER_PAGE
export const SCRAPE_MAX_IMAGES_PER_PAGE = ScrapeLimits.MAX_IMAGES_PER_PAGE
export const SCRAPE_MAX_SELECTOR_RESULTS = ScrapeLimits.MAX_SELECTOR_RESULTS
export const SCRAPE_MAX_IMAGES_FINAL = ScrapeLimits.MAX_IMAGES_FINAL
export const SCRAPE_MAX_LINKS_FINAL = ScrapeLimits.MAX_LINKS_FINAL

// Image Generation
export const IMAGE_GENERATION_DEFAULT_SIZE = ImageGeneration.DEFAULT_SIZE
export const IMAGE_GENERATION_MIN_SIZE = ImageGeneration.MIN_SIZE
export const IMAGE_GENERATION_MAX_SIZE = ImageGeneration.MAX_SIZE
export const IMAGE_GENERATION_DEFAULT_STEPS = ImageGeneration.DEFAULT_STEPS
export const IMAGE_GENERATION_MIN_STEPS = ImageGeneration.MIN_STEPS
export const IMAGE_GENERATION_MAX_STEPS = ImageGeneration.MAX_STEPS
export const IMAGE_GENERATION_DEFAULT_GUIDANCE = ImageGeneration.DEFAULT_GUIDANCE
export const IMAGE_GENERATION_MIN_GUIDANCE = ImageGeneration.MIN_GUIDANCE
export const IMAGE_GENERATION_MAX_GUIDANCE = ImageGeneration.MAX_GUIDANCE

// Validation Limits
export const EMAIL_LOCAL_PART_MAX_LENGTH = ValidationLimits.EMAIL_LOCAL_PART_MAX
export const EMAIL_DOMAIN_MAX_LENGTH = ValidationLimits.EMAIL_DOMAIN_MAX
export const PHONE_MIN_DIGITS = ValidationLimits.PHONE_MIN_DIGITS
export const PHONE_MAX_DIGITS = ValidationLimits.PHONE_MAX_DIGITS

// Zapier Config
export const ZAPIER_WEBHOOK_HOSTNAME = ZapierConfig.WEBHOOK_HOSTNAME
export const ZAPIER_INTEGRATION_NAME_MAX_LENGTH = ZapierConfig.NAME_MAX_LENGTH
export const ZAPIER_DESCRIPTION_MAX_LENGTH = ZapierConfig.DESCRIPTION_MAX_LENGTH

// AutoRAG
export const AUTORAG_INSTANCE_NAME = AutoRAGConfig.INSTANCE_NAME

// Radixes
export const DECIMAL_RADIX = Radix.DECIMAL
export const HEX_RADIX = Radix.HEX
