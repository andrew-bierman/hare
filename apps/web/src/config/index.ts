/**
 * Centralized application configuration
 * All UI content, feature flags, and settings should be defined here
 */

// =============================================================================
// App Metadata & Branding
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

	// Rabbit/Hare themed branding
	branding: {
		icon: 'Rabbit',
		tagline: 'Fast as a hare',
		mottos: [
			'Hop into production',
			'Quick as a bunny',
			'Built for speed - just like a hare',
		],
	},
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
	/** Enable AI chat features (feature flag for beta) */
	aiChat: process.env.ENABLE_AI_CHAT !== 'false', // Default enabled, can be disabled
	/** Restrict AI chat to specific users (beta mode) */
	aiChatBetaMode: process.env.AI_CHAT_BETA_MODE === 'true', // Default false
	/** Enable rate limiting */
	rateLimiting: true,
} as const

// =============================================================================
// Beta Access
// =============================================================================

export const BETA_ACCESS = {
	/** Enable beta access restrictions */
	enabled: FEATURES.aiChatBetaMode,
	/** Allowed user emails (comma-separated) */
	allowedEmails: process.env.AI_CHAT_ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [],
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
		badge: 'Public Beta',
		title: 'Build & Deploy',
		titleHighlight: 'AI Agents',
		titleSuffix: 'at the Edge',
		description:
			'The fastest way to create, deploy, and scale AI agents. Open source and self-hostable.',
		primaryCta: 'Start Building Free',
		secondaryCta: 'Live Demo',
	},
	stats: [
		{ value: '300+', label: 'Edge Locations', icon: 'Globe' },
		{ value: '<50ms', label: 'Global Latency', icon: 'Zap' },
		{ value: '99.99%', label: 'Uptime SLA', icon: 'Shield' },
		{ value: '10K+', label: 'Agents Deployed', icon: 'Bot' },
	],
	badges: [
		{ label: 'Open Source', icon: 'GitBranch' },
		{ label: '300+ Locations', icon: 'Globe' },
		{ label: '<50ms Latency', icon: 'Zap' },
	],
	features: [
		{
			title: 'Visual Agent Builder',
			description: 'Design complex agent workflows with our intuitive drag-and-drop interface.',
			icon: 'Boxes',
		},
		{
			title: 'Instant Deployment',
			description: "Deploy to Cloudflare's global edge network in seconds.",
			icon: 'Cloud',
		},
		{
			title: 'Built-in Tools',
			description: 'SQL, HTTP, KV, R2, and vector search ready to go.',
			icon: 'Layers',
		},
		{
			title: 'Developer SDK',
			description: 'Full TypeScript SDK with type-safe APIs.',
			icon: 'Code',
		},
		{
			title: 'Real-time Streaming',
			description: 'Stream responses with built-in WebSocket support.',
			icon: 'MessageSquare',
		},
		{
			title: 'Enterprise Security',
			description: 'SOC 2 compliant with end-to-end encryption.',
			icon: 'Shield',
		},
	],
	steps: [
		{ title: 'Define', description: 'Configure your agent', icon: 'Bot' },
		{ title: 'Add Tools', description: 'Connect databases & APIs', icon: 'Terminal' },
		{ title: 'Test', description: 'Iterate in playground', icon: 'Play' },
		{ title: 'Deploy', description: '300+ edge locations', icon: 'Globe' },
	],
	cta: {
		title: 'Ready to build your first agent?',
		description: 'Free to start, scales with you. Hop to it!',
		primaryCta: 'Get Started Free',
		secondaryCta: 'GitHub',
	},
	codeExample: `import { Agent } from '@hare/sdk'

const agent = new Agent({
  name: 'Support Bot',
  model: 'claude-3-sonnet',
  tools: ['database', 'email'],
})

await agent.deploy()`,
} as const

// =============================================================================
// Auth Pages Content
// =============================================================================

export const AUTH_CONTENT = {
	signIn: {
		title: 'Welcome back',
		subtitle: 'Sign in to your account to continue',
		submitButton: 'Sign In',
		loadingButton: 'Signing in...',
		forgotPassword: 'Forgot password?',
		noAccount: "Don't have an account?",
		signUpLink: 'Sign up',
	},
	signUp: {
		title: 'Create an account',
		subtitle: 'Get started with Hare for free',
		submitButton: 'Create Account',
		loadingButton: 'Creating account...',
		hasAccount: 'Already have an account?',
		signInLink: 'Sign in',
		terms: 'By creating an account, you agree to our',
		termsLink: 'Terms of Service',
		privacyLink: 'Privacy Policy',
	},
	layout: {
		headline: 'Build & Deploy\nAI Agents at the Edge',
		description: 'The fastest way to create, deploy, and scale AI agents. Hop into production in seconds with Cloudflare Workers.',
		footer: 'Built for speed - just like a hare',
	},
	fields: {
		email: { label: 'Email', placeholder: 'you@example.com' },
		password: { label: 'Password', placeholder: 'Enter your password' },
		confirmPassword: { label: 'Confirm Password', placeholder: 'Confirm your password' },
		name: { label: 'Full Name', placeholder: 'John Doe' },
	},
	validation: {
		passwordMinLength: 'Password must be at least 8 characters',
		passwordsNoMatch: 'Passwords do not match',
	},
	success: {
		signIn: 'Signed in successfully',
		signUp: 'Account created successfully',
		signOut: 'Signed out',
	},
} as const

// =============================================================================
// Dashboard Content
// =============================================================================

export const DASHBOARD_CONTENT = {
	header: {
		searchPlaceholder: 'Search agents, tools...',
	},
	sidebar: {
		docsLink: 'View Docs',
	},
	home: {
		title: 'Dashboard',
		subtitle: 'Overview of your agents and usage',
		newAgentButton: 'New Agent',
		noAgents: {
			title: 'No agents yet',
			description: 'Create your first AI agent to get started.',
			cta: 'Create Agent',
		},
		recentAgents: {
			title: 'Recent Agents',
			subtitle: 'Ordered by last update',
			viewAll: 'View all',
			createNew: 'Create New Agent',
		},
		stats: {
			totalAgents: { title: 'Total Agents', description: 'deployed' },
			apiCalls: { title: 'API Calls', description: 'This period' },
			tokensUsed: { title: 'Tokens Used', description: 'in / out' },
			activeTools: { title: 'Active Tools', description: 'Available' },
		},
		quickActions: [
			{ title: 'Create Agent', description: 'Build a new AI agent', icon: 'Bot', href: '/dashboard/agents/new' },
			{ title: 'Manage Tools', description: 'Configure capabilities', icon: 'Wrench', href: '/dashboard/tools' },
			{ title: 'View Usage', description: 'Monitor performance', icon: 'Activity', href: '/dashboard/usage' },
		],
	},
	agents: {
		title: 'Agents',
		subtitle: 'Manage your AI agents',
		newButton: 'New Agent',
		status: {
			deployed: 'Live',
			draft: 'Draft',
			archived: 'Archived',
		},
	},
	tools: {
		title: 'Tools',
		subtitle: 'Configure agent capabilities',
	},
	usage: {
		title: 'Usage',
		subtitle: 'Monitor your API usage and costs',
	},
	settings: {
		title: 'Settings',
		subtitle: 'Manage your account and preferences',
	},
} as const

// =============================================================================
// Dev Tools Content
// =============================================================================

export const DEV_TOOLS_CONTENT = {
	title: 'Dev Tools',
	badge: 'DEV',
	sections: {
		auth: {
			title: 'Authentication',
			signIn: 'Sign In',
			signUp: 'New User',
			signOut: 'Sign Out',
		},
		quickCreate: {
			title: 'Quick Create',
			agent: 'Agent',
			workspace: 'Workspace',
		},
		cache: {
			title: 'Cache',
			refresh: 'Refresh',
			clear: 'Clear',
		},
	},
	// Random rabbit-themed names for quick agent creation
	agentNames: [
		'Hoppy Helper',
		'Bunny Bot',
		'Carrot Cruncher',
		'Warren Wizard',
		'Fluffy Assistant',
		'Thumper AI',
		'Cotton Tail',
		'Jack Rabbit',
		'Velvet Ears',
		'Meadow Mind',
	],
	agentDescriptions: [
		'A speedy assistant that hops to help',
		'Burrows deep into problems to find solutions',
		'Quick as a hare, smart as a fox',
		'Your friendly neighborhood rabbit helper',
		'Nibbles through tasks with ease',
	],
	defaultInstructions: 'You are a helpful AI assistant with a playful rabbit personality. Be quick, helpful, and add occasional rabbit puns.',
} as const

// =============================================================================
// Common UI Text
// =============================================================================

export const UI_TEXT = {
	loading: 'Loading...',
	saving: 'Saving...',
	deleting: 'Deleting...',
	deploying: 'Deploying...',
	save: 'Save',
	cancel: 'Cancel',
	delete: 'Delete',
	edit: 'Edit',
	create: 'Create',
	deploy: 'Deploy',
	duplicate: 'Duplicate',
	back: 'Back',
	next: 'Next',
	done: 'Done',
	confirm: 'Confirm',
	close: 'Close',
	search: 'Search',
	filter: 'Filter',
	sort: 'Sort',
	refresh: 'Refresh',
	copy: 'Copy',
	copied: 'Copied!',
	viewAll: 'View all',
	learnMore: 'Learn more',
	getStarted: 'Get Started',
	signIn: 'Sign In',
	signUp: 'Sign Up',
	signOut: 'Sign Out',
	profile: 'Profile',
	settings: 'Settings',
	tools: 'tools',
	noDescription: 'No description provided',
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
// Rate Limiting
// =============================================================================

export const RATE_LIMITS = {
	/** Chat endpoint rate limits */
	chat: {
		/** Maximum requests per hour per user */
		requestsPerHour: 100,
		/** Maximum tokens per hour per user */
		tokensPerHour: 50000,
		/** Window duration in milliseconds (1 hour) */
		windowMs: 60 * 60 * 1000,
	},
	/** Agent creation rate limits */
	agentCreation: {
		/** Maximum agents created per hour per workspace */
		perHour: 10,
		windowMs: 60 * 60 * 1000,
	},
	/** API key usage */
	apiKey: {
		/** Maximum requests per hour per API key */
		requestsPerHour: 1000,
		windowMs: 60 * 60 * 1000,
	},
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type AppConfig = typeof APP_CONFIG
export type Features = typeof FEATURES
export type BetaAccess = typeof BETA_ACCESS
export type LandingPage = typeof LANDING_PAGE
export type NavItems = typeof NAV_ITEMS
export type ErrorMessages = typeof ERROR_MESSAGES
export type DevConfig = typeof DEV_CONFIG
export type RateLimits = typeof RATE_LIMITS
