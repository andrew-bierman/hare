/**
 * Centralized application configuration
 * All UI content, feature flags, and settings should be defined here
 */

// =============================================================================
// App Metadata
// =============================================================================

export const APP_CONFIG = {
	name: 'Hare',
	tagline: 'Build AI Agents in Minutes',
	description:
		'The fastest way to create, deploy, and manage AI agents. Built on Cloudflare Workers for instant global deployment.',
	version: '0.1.0',
	stage: 'beta' as const,
	repository: 'https://github.com/your-org/hare',
	docs: '/docs',
} as const

// =============================================================================
// Feature Flags
// =============================================================================

export const FEATURES = {
	/** Enable developer mode UI helpers */
	devMode: process.env.NODE_ENV === 'development',
	/** Show beta badge in UI */
	showBetaBadge: true,
	/** Enable workspace switching */
	workspaces: true,
	/** Enable usage analytics */
	analytics: true,
	/** Enable custom tools */
	customTools: true,
	/** Enable agent playground */
	playground: true,
} as const

// =============================================================================
// AI Models
// =============================================================================

export type ModelProvider = 'anthropic' | 'openai' | 'workers-ai'

export interface AIModel {
	id: string
	name: string
	provider: ModelProvider
	contextWindow: number
	maxOutputTokens: number
	supportsStreaming: boolean
	supportsTools: boolean
	/** Cost per 1M input tokens in USD */
	inputCostPer1M: number
	/** Cost per 1M output tokens in USD */
	outputCostPer1M: number
}

export const AI_MODELS: AIModel[] = [
	{
		id: 'claude-3-5-sonnet-20241022',
		name: 'Claude 3.5 Sonnet',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 8192,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 3.0,
		outputCostPer1M: 15.0,
	},
	{
		id: 'claude-3-5-haiku-20241022',
		name: 'Claude 3.5 Haiku',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 8192,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 0.8,
		outputCostPer1M: 4.0,
	},
	{
		id: 'claude-3-opus-20240229',
		name: 'Claude 3 Opus',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 4096,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 15.0,
		outputCostPer1M: 75.0,
	},
	{
		id: 'gpt-4o',
		name: 'GPT-4o',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 2.5,
		outputCostPer1M: 10.0,
	},
	{
		id: 'gpt-4o-mini',
		name: 'GPT-4o Mini',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsStreaming: true,
		supportsTools: true,
		inputCostPer1M: 0.15,
		outputCostPer1M: 0.6,
	},
	{
		id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
		name: 'Llama 3.3 70B',
		provider: 'workers-ai',
		contextWindow: 8192,
		maxOutputTokens: 2048,
		supportsStreaming: true,
		supportsTools: false,
		inputCostPer1M: 0,
		outputCostPer1M: 0,
	},
] as const

export const DEFAULT_MODEL_ID = 'claude-3-5-sonnet-20241022'

export function getModelById(id: string): AIModel | undefined {
	return AI_MODELS.find((m) => m.id === id)
}

export function getModelName(id: string): string {
	return getModelById(id)?.name ?? id
}

// =============================================================================
// System Tools
// =============================================================================

export type SystemToolType = 'http' | 'sql' | 'kv' | 'r2' | 'search' | 'browser'

export interface SystemTool {
	type: SystemToolType
	name: string
	description: string
	icon: string
	available: boolean
	requiredBinding?: string
}

export const SYSTEM_TOOLS: SystemTool[] = [
	{
		type: 'http',
		name: 'HTTP Requests',
		description: 'Make HTTP requests to external APIs and services',
		icon: 'Globe',
		available: true,
	},
	{
		type: 'sql',
		name: 'D1 Database',
		description: 'Query and modify data in Cloudflare D1 SQLite databases',
		icon: 'Database',
		available: true,
		requiredBinding: 'DB',
	},
	{
		type: 'kv',
		name: 'KV Storage',
		description: 'Read and write to Cloudflare Workers KV key-value store',
		icon: 'Key',
		available: true,
		requiredBinding: 'KV',
	},
	{
		type: 'r2',
		name: 'R2 Storage',
		description: 'Store and retrieve files from Cloudflare R2 object storage',
		icon: 'HardDrive',
		available: true,
		requiredBinding: 'R2',
	},
	{
		type: 'search',
		name: 'AI Search',
		description: 'Semantic search using Cloudflare AI Search (AutoRAG)',
		icon: 'Sparkles',
		available: true,
		requiredBinding: 'AI',
	},
	{
		type: 'browser',
		name: 'Browser Automation',
		description: 'Automate browser interactions using Cloudflare Browser Rendering',
		icon: 'Monitor',
		available: false,
		requiredBinding: 'BROWSER',
	},
] as const

export function getAvailableTools(): SystemTool[] {
	return SYSTEM_TOOLS.filter((t) => t.available)
}

// =============================================================================
// Agent Configuration
// =============================================================================

export type AgentStatus = 'draft' | 'deployed' | 'archived'

export interface AgentDefaults {
	model: string
	temperature: number
	maxTokens: number
	status: AgentStatus
}

export const AGENT_DEFAULTS: AgentDefaults = {
	model: DEFAULT_MODEL_ID,
	temperature: 0.7,
	maxTokens: 4096,
	status: 'draft',
}

export const AGENT_LIMITS = {
	nameMinLength: 1,
	nameMaxLength: 100,
	descriptionMaxLength: 500,
	instructionsMaxLength: 10000,
	maxToolsPerAgent: 20,
} as const

// =============================================================================
// Landing Page Content
// =============================================================================

export const LANDING_PAGE = {
	hero: {
		badge: 'Now in Public Beta',
		title: 'Build & Deploy',
		titleHighlight: 'AI Agents at the Edge',
		description:
			'The fastest way to create, deploy, and scale AI agents. Built on Cloudflare Workers for instant global deployment. Open source and self-hostable.',
		primaryCta: 'Start Building Free',
		secondaryCta: 'View Live Demo',
	},
	stats: [
		{ value: '300+', label: 'Edge Locations' },
		{ value: '<50ms', label: 'Global Latency' },
		{ value: '99.99%', label: 'Uptime SLA' },
		{ value: '10K+', label: 'Agents Deployed' },
	],
	features: [
		{
			title: 'Visual Agent Builder',
			description:
				'Design complex agent workflows with our intuitive drag-and-drop interface. No code required to get started.',
			icon: 'Boxes',
		},
		{
			title: 'Instant Deployment',
			description:
				"Deploy to Cloudflare's global edge network in seconds. Your agents run close to your users, everywhere.",
			icon: 'Cloud',
		},
		{
			title: 'Built-in Tools',
			description:
				'Connect to databases, APIs, and storage out of the box. SQL, HTTP, KV, R2, and vector search ready to go.',
			icon: 'Layers',
		},
		{
			title: 'Developer SDK',
			description:
				'Full TypeScript SDK with type-safe APIs. Integrate agents into any application with a few lines of code.',
			icon: 'Code',
		},
		{
			title: 'Real-time Streaming',
			description:
				'Stream responses as they generate. Build responsive chat interfaces with built-in WebSocket support.',
			icon: 'MessageSquare',
		},
		{
			title: 'Enterprise Security',
			description:
				'SOC 2 compliant infrastructure with end-to-end encryption. Your data never leaves your control.',
			icon: 'Shield',
		},
	],
	steps: [
		{
			step: '01',
			title: 'Define Your Agent',
			description: "Configure your agent's personality, capabilities, and the tools it can access.",
			icon: 'Bot',
		},
		{
			step: '02',
			title: 'Add Tools & Integrations',
			description:
				'Connect databases, APIs, and custom functions. Your agent becomes truly powerful.',
			icon: 'Terminal',
		},
		{
			step: '03',
			title: 'Test in Playground',
			description: 'Iterate quickly with our live playground. See exactly how your agent behaves.',
			icon: 'Play',
		},
		{
			step: '04',
			title: 'Deploy Globally',
			description: 'One click to deploy. Your agent runs on 300+ edge locations worldwide.',
			icon: 'Globe',
		},
	],
	cta: {
		title: 'Ready to build your first agent?',
		description:
			'Join developers who are building the future of AI-powered applications. Free to start, scales with you.',
		primaryCta: 'Get Started Free',
		secondaryCta: 'Star on GitHub',
	},
} as const

// =============================================================================
// Navigation
// =============================================================================

export const NAV_ITEMS = {
	main: [
		{ label: 'Features', href: '#features' },
		{ label: 'How it Works', href: '#how-it-works' },
		{ label: 'GitHub', href: APP_CONFIG.repository, external: true },
		{ label: 'Docs', href: APP_CONFIG.docs },
	],
	dashboard: [
		{ label: 'Dashboard', href: '/dashboard', icon: 'Home' },
		{ label: 'Agents', href: '/dashboard/agents', icon: 'Bot' },
		{ label: 'Tools', href: '/dashboard/tools', icon: 'Wrench' },
		{ label: 'Usage', href: '/dashboard/usage', icon: 'Activity' },
		{ label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
	],
	footer: [
		{ label: 'Documentation', href: APP_CONFIG.docs },
		{ label: 'GitHub', href: APP_CONFIG.repository },
		{ label: 'Privacy', href: '/privacy' },
		{ label: 'Terms', href: '/terms' },
	],
} as const

// =============================================================================
// Error Messages
// =============================================================================

export const ERROR_MESSAGES = {
	// Auth
	AUTH_REQUIRED: 'You must be signed in to access this resource',
	AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
	AUTH_SESSION_EXPIRED: 'Your session has expired. Please sign in again.',

	// Agents
	AGENT_NOT_FOUND: 'Agent not found',
	AGENT_CREATE_FAILED: 'Failed to create agent',
	AGENT_UPDATE_FAILED: 'Failed to update agent',
	AGENT_DELETE_FAILED: 'Failed to delete agent',
	AGENT_DEPLOY_FAILED: 'Failed to deploy agent',
	AGENT_NOT_DEPLOYED: 'Agent must be deployed before testing',

	// Tools
	TOOL_NOT_FOUND: 'Tool not found',
	TOOL_CREATE_FAILED: 'Failed to create tool',
	TOOL_INVALID_TYPE: 'Invalid tool type',

	// Workspaces
	WORKSPACE_NOT_FOUND: 'Workspace not found',
	WORKSPACE_CREATE_FAILED: 'Failed to create workspace',
	WORKSPACE_REQUIRED: 'A workspace is required',

	// Chat
	CHAT_FAILED: 'Failed to send message',
	CHAT_STREAM_ERROR: 'Error in chat stream',

	// Generic
	NETWORK_ERROR: 'Network error. Please check your connection.',
	UNKNOWN_ERROR: 'An unexpected error occurred',
	VALIDATION_ERROR: 'Please check your input and try again',
	RATE_LIMITED: 'Too many requests. Please try again later.',
	SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
} as const

// =============================================================================
// Dev Mode Configuration
// =============================================================================

export const DEV_CONFIG = {
	/** Test user credentials for quick sign-in */
	testUser: {
		email: 'test@example.com',
		password: 'password123',
	},
	/** Show API response times in console */
	logApiTiming: true,
	/** Show state changes in console */
	logStateChanges: true,
	/** Artificial delay for API calls (ms) - useful for testing loading states */
	apiDelay: 0,
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type AppConfig = typeof APP_CONFIG
export type Features = typeof FEATURES
export type LandingPage = typeof LANDING_PAGE
export type NavItems = typeof NAV_ITEMS
export type ErrorMessages = typeof ERROR_MESSAGES
export type DevConfig = typeof DEV_CONFIG
