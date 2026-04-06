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
	/** Max text length for summarization */
	AI_LONG: 50_000,
	/** Max context length for RAG/question-answer operations */
	RAG_CONTEXT: 15_000,
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
