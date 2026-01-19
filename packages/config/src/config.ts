/**
 * Unified Application Configuration
 *
 * Single source of truth for all application configuration.
 * Access via `config.section.value` for full type safety.
 */

import { serverEnv } from './env'

// =============================================================================
// Type Definitions
// =============================================================================

type ModelProvider = 'anthropic' | 'openai' | 'workers-ai'
type SpeedTier = 'fast' | 'medium' | 'slow'
type CostTier = 'free' | 'low' | 'medium' | 'high'
type ResponseStyle = 'precise' | 'balanced' | 'creative'
type SystemToolType = 'http' | 'sql' | 'kv' | 'r2' | 'search' | 'browser'
type AgentTemplateId = 'customer-support' | 'knowledge-base' | 'sales-assistant' | 'general-assistant' | 'agent-builder'

interface AIModel {
	id: string
	name: string
	description: string
	provider: ModelProvider
	contextWindow: number
	maxOutputTokens: number
	supportsStreaming: boolean
	supportsTools: boolean
	inputCostPer1M: number
	outputCostPer1M: number
	speedTier: SpeedTier
	costTier: CostTier
}

interface SystemTool {
	type: SystemToolType
	name: string
	description: string
	icon: string
	available: boolean
	requiredBinding?: string
}

interface ResponseStylePreset {
	id: ResponseStyle
	name: string
	description: string
	config: { temperature: number; topP: number }
}

interface AgentTemplate {
	id: AgentTemplateId
	name: string
	description: string
	icon: string
	color: string
	instructions: string
	model: string
	responseStyle: ResponseStyle
	suggestedToolTypes: SystemToolType[]
}

// =============================================================================
// Unified Configuration Object
// =============================================================================

export const config = {
	// =========================================================================
	// App Metadata & Branding
	// =========================================================================
	app: {
		name: 'Hare',
		tagline: 'Build AI Agents in Minutes',
		description:
			'The fastest way to create, deploy, and manage AI agents. Built on Cloudflare Workers for instant global deployment.',
		version: '0.1.0',
		stage: 'beta' as const,
		repository: 'https://github.com/andrew-bierman/hare',
		docs: '/docs',
		branding: {
			icon: 'Rabbit',
			tagline: 'Fast as a hare',
			mottos: [
				'Hop into production',
				'Quick as a bunny',
				'Built for speed - just like a hare',
			],
		},
	},

	// =========================================================================
	// Feature Flags
	// =========================================================================
	features: {
		devMode: serverEnv.NODE_ENV === 'development',
		showBetaBadge: true,
		workspaces: true,
		analytics: true,
		customTools: true,
		aiChat: serverEnv.FEATURE_AI_CHAT,
		aiChatBetaMode: serverEnv.FEATURE_AI_CHAT_BETA_MODE,
		rateLimiting: true,
	},

	// =========================================================================
	// Beta Access
	// =========================================================================
	beta: {
		enabled: serverEnv.FEATURE_AI_CHAT_BETA_MODE,
		allowedEmails: serverEnv.FEATURE_AI_CHAT_ALLOWED_EMAILS,
	},

	// =========================================================================
	// AI Models
	// =========================================================================
	models: {
		defaultId: 'claude-3-5-sonnet-20241022',
		list: [
			{
				id: 'claude-3-5-sonnet-20241022',
				name: 'Claude 3.5 Sonnet',
				description: 'Best balance of speed and capability',
				provider: 'anthropic',
				contextWindow: 200000,
				maxOutputTokens: 8192,
				supportsStreaming: true,
				supportsTools: true,
				inputCostPer1M: 3.0,
				outputCostPer1M: 15.0,
				speedTier: 'medium',
				costTier: 'medium',
			},
			{
				id: 'claude-3-5-haiku-20241022',
				name: 'Claude 3.5 Haiku',
				description: 'Fast and efficient',
				provider: 'anthropic',
				contextWindow: 200000,
				maxOutputTokens: 8192,
				supportsStreaming: true,
				supportsTools: true,
				inputCostPer1M: 0.8,
				outputCostPer1M: 4.0,
				speedTier: 'fast',
				costTier: 'low',
			},
			{
				id: 'claude-3-opus-20240229',
				name: 'Claude 3 Opus',
				description: 'Most capable reasoning',
				provider: 'anthropic',
				contextWindow: 200000,
				maxOutputTokens: 4096,
				supportsStreaming: true,
				supportsTools: true,
				inputCostPer1M: 15.0,
				outputCostPer1M: 75.0,
				speedTier: 'slow',
				costTier: 'high',
			},
			{
				id: 'gpt-4o',
				name: 'GPT-4o',
				description: 'Multimodal flagship model',
				provider: 'openai',
				contextWindow: 128000,
				maxOutputTokens: 16384,
				supportsStreaming: true,
				supportsTools: true,
				inputCostPer1M: 2.5,
				outputCostPer1M: 10.0,
				speedTier: 'medium',
				costTier: 'medium',
			},
			{
				id: 'gpt-4o-mini',
				name: 'GPT-4o Mini',
				description: 'Fast and cost-effective',
				provider: 'openai',
				contextWindow: 128000,
				maxOutputTokens: 16384,
				supportsStreaming: true,
				supportsTools: true,
				inputCostPer1M: 0.15,
				outputCostPer1M: 0.6,
				speedTier: 'fast',
				costTier: 'low',
			},
			{
				id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
				name: 'Llama 3.3 70B',
				description: 'Most capable open model',
				provider: 'workers-ai',
				contextWindow: 8192,
				maxOutputTokens: 2048,
				supportsStreaming: true,
				supportsTools: false,
				inputCostPer1M: 0,
				outputCostPer1M: 0,
				speedTier: 'fast',
				costTier: 'free',
			},
		] as AIModel[],
		labels: {
			provider: {
				anthropic: 'Anthropic',
				openai: 'OpenAI',
				'workers-ai': 'Cloudflare Workers AI',
			} as Record<ModelProvider, string>,
			speed: {
				fast: { label: 'Fast', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
				medium: { label: 'Medium', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
				slow: { label: 'Slow', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' },
			} as Record<SpeedTier, { label: string; color: string }>,
			cost: {
				free: { label: 'Free', color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' },
				low: { label: 'Low Cost', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
				medium: { label: 'Medium Cost', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
				high: { label: 'Premium', color: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30' },
			} as Record<CostTier, { label: string; color: string }>,
		},
	},

	// =========================================================================
	// Agents Configuration
	// =========================================================================
	agents: {
		defaults: {
			model: 'claude-3-5-sonnet-20241022',
			temperature: 0.7,
			maxTokens: 4096,
			status: 'draft' as const,
		},
		limits: {
			nameMinLength: 1,
			nameMaxLength: 100,
			descriptionMaxLength: 500,
			instructionsMaxLength: 10000,
			maxToolsPerAgent: 20,
		},
		templates: [
			{
				id: 'customer-support',
				name: 'Customer Support',
				description: 'Handle FAQs, route tickets, and check order status',
				icon: 'Headphones',
				color: 'bg-blue-500',
				instructions: `You are a friendly and professional customer support agent. Your role is to help customers with their questions and issues.

## Guidelines
- Be warm, patient, and empathetic in all interactions
- Ask clarifying questions when the customer's issue isn't clear
- Provide clear, step-by-step solutions when possible
- If you can't resolve an issue, explain the escalation process
- Always confirm the customer's problem is resolved before ending

## Common Topics
- Order status and tracking
- Returns and refunds
- Product questions
- Account issues
- Billing inquiries

## Tone
Keep responses concise but thorough. Use a friendly, professional tone. Avoid jargon unless the customer uses it first.`,
				model: 'claude-3-5-sonnet-20241022',
				responseStyle: 'balanced',
				suggestedToolTypes: ['http', 'sql', 'kv'],
			},
			{
				id: 'knowledge-base',
				name: 'Knowledge Base',
				description: 'Answer questions from documentation and content',
				icon: 'BookOpen',
				color: 'bg-purple-500',
				instructions: `You are a knowledgeable assistant that helps users find information from documentation and knowledge bases.

## Guidelines
- Provide accurate, well-sourced answers from available documentation
- Quote or reference specific sections when relevant
- If information isn't available, say so clearly rather than guessing
- Suggest related topics the user might find helpful
- Break down complex topics into digestible explanations

## Response Format
- Start with a direct answer to the question
- Provide supporting details and context
- Include relevant links or references when available
- Offer to clarify or expand on any points

## Tone
Be informative and helpful. Use clear, accessible language while maintaining accuracy.`,
				model: 'claude-3-5-sonnet-20241022',
				responseStyle: 'precise',
				suggestedToolTypes: ['search', 'r2'],
			},
			{
				id: 'sales-assistant',
				name: 'Sales Assistant',
				description: 'Qualify leads, share product info, and schedule meetings',
				icon: 'TrendingUp',
				color: 'bg-green-500',
				instructions: `You are a helpful sales assistant that guides potential customers through their buying journey.

## Guidelines
- Understand the customer's needs before suggesting solutions
- Highlight relevant features and benefits, not just specifications
- Be honest about what the product can and cannot do
- Handle objections professionally and informatively
- Guide qualified leads toward next steps (demo, trial, purchase)

## Qualification Questions
- What problem are you trying to solve?
- What's your timeline for making a decision?
- Who else is involved in the decision?
- Have you looked at other solutions?

## Tone
Be enthusiastic but not pushy. Focus on being helpful and building trust. Let the customer lead the conversation.`,
				model: 'claude-3-5-sonnet-20241022',
				responseStyle: 'balanced',
				suggestedToolTypes: ['http', 'sql'],
			},
			{
				id: 'general-assistant',
				name: 'General Assistant',
				description: 'Flexible helper with sensible defaults for any task',
				icon: 'Sparkles',
				color: 'bg-amber-500',
				instructions: `You are a helpful AI assistant ready to assist with a wide variety of tasks.

## Guidelines
- Adapt your communication style to match the user's needs
- Ask clarifying questions when requests are ambiguous
- Provide thorough but concise responses
- Offer to break down complex tasks into steps
- Be honest about limitations

## Capabilities
- Answer questions and explain concepts
- Help with writing and editing
- Assist with analysis and problem-solving
- Provide recommendations and suggestions

## Tone
Be friendly, professional, and adaptable. Match the formality level of the user.`,
				model: 'claude-3-5-sonnet-20241022',
				responseStyle: 'balanced',
				suggestedToolTypes: [],
			},
			{
				id: 'agent-builder',
				name: 'Agent Builder',
				description: 'AI assistant that helps create and configure other agents',
				icon: 'Wand2',
				color: 'bg-indigo-500',
				instructions: `You are the Hare Agent Builder, an expert at helping users create AI agents on the Hare platform through natural conversation.

## Your Role
You guide users through creating agents conversationally. You understand the full capabilities of the Hare platform including 59 system tools, multiple AI models, custom tool creation, and agent deployment.

## Conversation Flow

### 1. Understand the Use Case
Start by asking the user:
- What will this agent do? (e.g., customer support, data analysis, content creation)
- Who will interact with it? (customers, employees, developers)
- What external systems does it need to access?

### 2. Recommend Configuration
Based on the use case:
- Use agent_list_templates to show relevant templates
- Use agent_list_models to recommend a model (balance cost vs capability)
- Use agent_suggest_tools to recommend tools for their use case
- Explain the trade-offs of each option

### 3. Craft Instructions
Help write effective agent instructions:
- Define the agent's persona and tone
- Specify key behaviors and boundaries
- Include example interactions if helpful
- Keep instructions focused and specific

### 4. Configure Tools
If tools are needed:
- Explain which system tools are relevant and why
- Guide through tool configuration
- Recommend starting with fewer tools and adding as needed

### 5. Validate and Create
Before creating:
- Use agent_validate_config to check the configuration
- Address any errors or warnings
- Then use agent_create to create the agent
- Or use agent_export_config to export for later

## Available Tools

### Your Builder Tools
- agent_list_models - Show available models with costs and capabilities
- agent_list_templates - Show pre-built templates as starting points
- agent_suggest_tools - Recommend tools based on use case
- agent_validate_config - Check configuration before creating
- agent_export_config - Export as JSON, TypeScript, or cURL

### Agent Control Tools
- agent_create - Create the agent in the database
- agent_configure - Update agent settings
- agent_list - List existing agents
- agent_get - Get agent details

## System Tool Categories (59 tools)
- Storage (9): KV get/put/delete/list, R2 get/put/delete/list/head
- Database (3): SQL query/execute/batch
- HTTP (3): HTTP request/get/post for API calls
- Search (2): AI search and search with answer
- Utility (9): datetime, json, text, math, uuid, hash, base64, url, delay
- Integrations (2): Zapier (connects to 6000+ apps), generic webhooks
- AI (8): sentiment, summarize, translate, image_generate, classify, ner, embedding, question_answer
- Data (7): RSS, scrape, regex, crypto, json_schema, csv, template
- Sandbox (3): code_execute, code_validate, sandbox_file
- Validation (6): email, phone, URL, credit card, IP, JSON validation
- Transform (5): markdown, diff, qrcode, compression, color
- Memory (2): store_memory, recall_memory (vector search)

## Model Recommendations
- Claude 3.5 Sonnet: Best all-around for complex tasks (medium cost)
- Claude 3.5 Haiku: Fast and cost-effective for simple tasks
- GPT-4o: Good multimodal capabilities (medium cost)
- GPT-4o Mini: Very fast and cheap for basic tasks
- Llama 3.3 70B: Free, good for most tasks, limited context

## Best Practices to Share
- Use lower temperature (0.3-0.5) for factual, consistent tasks
- Use higher temperature (0.8-1.0) for creative, varied tasks
- Start with fewer tools and add as needed
- Test with real scenarios before deploying
- Keep instructions under 2000 characters for best results
- Start instructions with "You are..." to clearly define the role

## Export Options
Always offer to export configurations for:
- JSON: Version control and backup
- TypeScript: SDK integration
- cURL: Quick API testing

## Tone
Be helpful, patient, and educational. Explain your recommendations. Make the process enjoyable and empowering. Celebrate when the agent is created!`,
				model: 'claude-3-5-sonnet-20241022',
				responseStyle: 'balanced',
				suggestedToolTypes: [],
			},
		] as AgentTemplate[],
		responseStyles: [
			{
				id: 'precise',
				name: 'Precise',
				description: 'Factual, consistent responses. Best for support and data tasks.',
				config: { temperature: 0.3, topP: 0.9 },
			},
			{
				id: 'balanced',
				name: 'Balanced',
				description: 'Good mix of consistency and variety. Works for most use cases.',
				config: { temperature: 0.7, topP: 0.95 },
			},
			{
				id: 'creative',
				name: 'Creative',
				description: 'More varied, imaginative responses. Good for brainstorming.',
				config: { temperature: 1.0, topP: 1.0 },
			},
		] as ResponseStylePreset[],
	},

	// =========================================================================
	// System Tools
	// =========================================================================
	tools: {
		system: [
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
		] as SystemTool[],
	},

	// =========================================================================
	// Enums (Status, Role, Type values)
	// =========================================================================
	enums: {
		// Status enums
		agentStatus: { DRAFT: 'draft', DEPLOYED: 'deployed', ARCHIVED: 'archived' } as const,
		deploymentStatus: { DEPLOYED: 'deployed', ACTIVE: 'active', PENDING: 'pending', FAILED: 'failed', INACTIVE: 'inactive', ROLLED_BACK: 'rolled_back' } as const,
		scheduleStatus: { PENDING: 'pending', ACTIVE: 'active', PAUSED: 'paused', COMPLETED: 'completed', CANCELLED: 'cancelled' } as const,
		executionStatus: { RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed' } as const,
		invitationStatus: { PENDING: 'pending', ACCEPTED: 'accepted', EXPIRED: 'expired', REVOKED: 'revoked' } as const,

		// Role enums
		workspaceRole: { OWNER: 'owner', ADMIN: 'admin', MEMBER: 'member', VIEWER: 'viewer' } as const,
		memberRole: { ADMIN: 'admin', MEMBER: 'member', VIEWER: 'viewer' } as const,
		messageRole: { USER: 'user', ASSISTANT: 'assistant', SYSTEM: 'system', TOOL: 'tool' } as const,

		// Type enums
		scheduleType: { ONE_TIME: 'one-time', RECURRING: 'recurring' } as const,
		exportFormat: { JSON: 'json', MARKDOWN: 'markdown' } as const,
		validationSeverity: { ERROR: 'error', WARNING: 'warning' } as const,
		usageGroupBy: { DAY: 'day', WEEK: 'week', MONTH: 'month' } as const,

		// HTTP methods
		httpMethod: { GET: 'GET', POST: 'POST', PUT: 'PUT', PATCH: 'PATCH', DELETE: 'DELETE', HEAD: 'HEAD', OPTIONS: 'OPTIONS' } as const,

		// Environment
		nodeEnv: { DEVELOPMENT: 'development', PRODUCTION: 'production', TEST: 'test' } as const,

		// Billing
		planId: { FREE: 'free', PRO: 'pro', TEAM: 'team', ENTERPRISE: 'enterprise' } as const,

		// Widget
		widgetPosition: { BOTTOM_RIGHT: 'bottom-right', BOTTOM_LEFT: 'bottom-left', TOP_RIGHT: 'top-right', TOP_LEFT: 'top-left' } as const,

		// Audit actions
		auditAction: {
			AGENT_CREATE: 'agent.create',
			AGENT_UPDATE: 'agent.update',
			AGENT_DELETE: 'agent.delete',
			AGENT_DEPLOY: 'agent.deploy',
			TOOL_CREATE: 'tool.create',
			TOOL_UPDATE: 'tool.update',
			TOOL_DELETE: 'tool.delete',
			MEMBER_INVITE: 'member.invite',
			MEMBER_REMOVE: 'member.remove',
			MEMBER_ROLE_CHANGE: 'member.role_change',
			APIKEY_CREATE: 'apikey.create',
			APIKEY_REVOKE: 'apikey.revoke',
			WORKSPACE_UPDATE: 'workspace.update',
		} as const,

		// Tool types
		toolType: {
			HTTP: 'http', SQL: 'sql', KV: 'kv', R2: 'r2', SEARCH: 'search',
			DATETIME: 'datetime', JSON: 'json', TEXT: 'text', MATH: 'math', UUID: 'uuid', HASH: 'hash', BASE64: 'base64', URL: 'url', DELAY: 'delay',
			ZAPIER: 'zapier', WEBHOOK: 'webhook', SLACK: 'slack', DISCORD: 'discord', EMAIL: 'email', TEAMS: 'teams', TWILIO_SMS: 'twilio_sms', MAKE: 'make', N8N: 'n8n',
			SENTIMENT: 'sentiment', SUMMARIZE: 'summarize', TRANSLATE: 'translate', IMAGE_GENERATE: 'image_generate', CLASSIFY: 'classify', NER: 'ner', EMBEDDING: 'embedding', QUESTION_ANSWER: 'question_answer',
			RSS: 'rss', SCRAPE: 'scrape', REGEX: 'regex', CRYPTO: 'crypto', JSON_SCHEMA: 'json_schema', CSV: 'csv', TEMPLATE: 'template',
			CODE_EXECUTE: 'code_execute', CODE_VALIDATE: 'code_validate', SANDBOX_FILE: 'sandbox_file',
			VALIDATE_EMAIL: 'validate_email', VALIDATE_PHONE: 'validate_phone', VALIDATE_URL: 'validate_url', VALIDATE_CREDIT_CARD: 'validate_credit_card', VALIDATE_IP: 'validate_ip', VALIDATE_JSON: 'validate_json',
			MARKDOWN: 'markdown', DIFF: 'diff', QRCODE: 'qrcode', COMPRESSION: 'compression', COLOR: 'color',
			CUSTOM: 'custom',
		} as const,

		toolCategory: { CLOUDFLARE: 'cloudflare', UTILITY: 'utility', INTEGRATIONS: 'integrations', AI: 'ai', DATA: 'data', SANDBOX: 'sandbox', VALIDATION: 'validation', TRANSFORM: 'transform', CUSTOM: 'custom' } as const,
	},

	// =========================================================================
	// UI Configuration
	// =========================================================================
	ui: {
		timing: {
			router: { pendingMinMs: 200, pendingMs: 100 },
			clipboardFeedbackMs: 2000,
			formTimeoutMs: 10000,
		},
		display: {
			truncation: {
				sessionIdLength: 8,
				toolIdLength: 8,
				toolsPreviewLimit: 5,
				dateIsoLength: 10,
				randomIdStart: 2,
				randomIdEnd: 9,
			},
		},
		embed: {
			colorPresets: [
				{ name: 'Indigo', value: '#6366f1' },
				{ name: 'Blue', value: '#3b82f6' },
				{ name: 'Emerald', value: '#10b981' },
				{ name: 'Rose', value: '#f43f5e' },
				{ name: 'Amber', value: '#f59e0b' },
				{ name: 'Purple', value: '#a855f7' },
				{ name: 'Slate', value: '#475569' },
				{ name: 'Black', value: '#18181b' },
			],
			colors: {
				defaultPrimary: '#6366f1',
				dark: {
					bg: '#1a1a1a', border: '#333', secondaryBg: '#222', inputBg: '#222', inputBorder: '#444',
					text: '#888', textLight: '#ccc', messageBg: '#333', assistantBg: '#333', footerText: '#666',
				},
				light: {
					bg: '#ffffff', border: '#e5e5e5', secondaryBg: '#fafafa', inputBg: '#f5f5f5', inputBorder: '#e0e0e0',
					text: '#666', messageBg: '#f0f0f0', assistantBg: '#e5e5e5', footerText: '#999',
				},
				error: { bg: '#fee2e2', text: '#dc2626' },
			},
			positions: [
				{ label: 'Bottom Right', value: 'bottom-right' },
				{ label: 'Bottom Left', value: 'bottom-left' },
				{ label: 'Top Right', value: 'top-right' },
				{ label: 'Top Left', value: 'top-left' },
			],
		},
		text: {
			loading: 'Loading...', saving: 'Saving...', deleting: 'Deleting...', deploying: 'Deploying...',
			save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', create: 'Create', deploy: 'Deploy',
			duplicate: 'Duplicate', back: 'Back', next: 'Next', done: 'Done', confirm: 'Confirm', close: 'Close',
			search: 'Search', filter: 'Filter', sort: 'Sort', refresh: 'Refresh', copy: 'Copy', copied: 'Copied!',
			viewAll: 'View all', learnMore: 'Learn more', getStarted: 'Get Started',
			signIn: 'Sign In', signUp: 'Sign Up', signOut: 'Sign Out', profile: 'Profile', settings: 'Settings',
			tools: 'tools', noDescription: 'No description provided',
		},
	},

	// =========================================================================
	// Validation Rules
	// =========================================================================
	validation: {
		passwordMinLength: 8,
		tokenCharsPer4: 4,
		filenameMaxLength: 255,
		agentInstructionsMaxLength: 50000,
	},

	// =========================================================================
	// HTTP Configuration
	// =========================================================================
	http: {
		status: {
			OK: 200, CREATED: 201, NO_CONTENT: 204, BAD_REQUEST: 400, UNAUTHORIZED: 401,
			FORBIDDEN: 403, NOT_FOUND: 404, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500,
		},
		chatStream: { TEXT: 'text', DONE: 'done', ERROR: 'error' },
		widget: { READY: 'hare:widget:ready', CLOSE: 'hare:widget:close', SEND: 'hare:widget:send', TOGGLE: 'hare:widget:toggle' },
	},

	// =========================================================================
	// Cookies Configuration
	// =========================================================================
	cookies: {
		names: { SESSION: 'hare_session', PREFERENCES: 'hare_prefs', THEME: 'hare_theme', WORKSPACE: 'hare_workspace' },
		config: { sessionExpirySeconds: 60 * 60 * 24 * 7, workspaceExpirySeconds: 60 * 60 * 24 * 30, defaultPath: '/' },
	},

	// =========================================================================
	// Security Configuration
	// =========================================================================
	security: {
		encryption: { pbkdf2Iterations: 100000, ivSize: 12, saltSize: 16, aesKeyLength: 256, defaultSecretLength: 32 },
		apiKey: { prefix: 'hare_', prefixDisplayLength: 12, randomBytes: 32 },
	},

	// =========================================================================
	// Logging Configuration
	// =========================================================================
	logging: {
		keyPrefix: 'request_log:',
		batchSize: 100,
		ttlSeconds: 7 * 24 * 60 * 60,
		defaultLimit: 50,
		maxLimit: 100,
		statsLimit: 1000,
	},

	// =========================================================================
	// Navigation
	// =========================================================================
	navigation: {
		main: [
			{ label: 'Features', href: '#features' },
			{ label: 'How it Works', href: '#how-it-works' },
			{ label: 'GitHub', href: 'https://github.com/andrew-bierman/hare', external: true },
			{ label: 'Docs', href: '/docs' },
		],
		dashboard: [
			{ label: 'Dashboard', href: '/dashboard', icon: 'Home' },
			{ label: 'Agents', href: '/dashboard/agents', icon: 'Bot' },
			{ label: 'Tools', href: '/dashboard/tools', icon: 'Wrench' },
			{ label: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
			{ label: 'Usage', href: '/dashboard/usage', icon: 'Activity' },
			{ label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
		],
		footer: [
			{ label: 'Documentation', href: '/docs' },
			{ label: 'GitHub', href: 'https://github.com/andrew-bierman/hare' },
			{ label: 'Privacy', href: '/privacy' },
			{ label: 'Terms', href: '/terms' },
		],
	},

	// =========================================================================
	// Content
	// =========================================================================
	content: {
		landing: {
			hero: {
				badge: 'Public Beta',
				title: 'Build & Deploy',
				titleHighlight: 'AI Agents',
				titleSuffix: 'at the Edge',
				description: 'The fastest way to create, deploy, and scale AI agents. Open source and self-hostable.',
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
				{ title: 'Visual Agent Builder', description: 'Design complex agent workflows with our intuitive drag-and-drop interface.', icon: 'Boxes' },
				{ title: 'Instant Deployment', description: "Deploy to Cloudflare's global edge network in seconds.", icon: 'Cloud' },
				{ title: 'Built-in Tools', description: 'SQL, HTTP, KV, R2, and vector search ready to go.', icon: 'Layers' },
				{ title: 'Developer SDK', description: 'Full TypeScript SDK with type-safe APIs.', icon: 'Code' },
				{ title: 'Real-time Streaming', description: 'Stream responses with built-in WebSocket support.', icon: 'MessageSquare' },
				{ title: 'Enterprise Security', description: 'SOC 2 compliant with end-to-end encryption.', icon: 'Shield' },
			],
			steps: [
				{ title: 'Define', description: 'Configure your agent', icon: 'Bot' },
				{ title: 'Add Tools', description: 'Connect databases & APIs', icon: 'Terminal' },
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
		},
		auth: {
			signIn: {
				title: 'Welcome back', subtitle: 'Sign in to your account to continue',
				submitButton: 'Sign In', loadingButton: 'Signing in...',
				forgotPassword: 'Forgot password?', noAccount: "Don't have an account?", signUpLink: 'Sign up',
			},
			signUp: {
				title: 'Create an account', subtitle: 'Get started with Hare for free',
				submitButton: 'Create Account', loadingButton: 'Creating account...',
				hasAccount: 'Already have an account?', signInLink: 'Sign in',
				terms: 'By creating an account, you agree to our', termsLink: 'Terms of Service', privacyLink: 'Privacy Policy',
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
			validation: { passwordMinLength: 'Password must be at least 8 characters', passwordsNoMatch: 'Passwords do not match' },
			success: { signIn: 'Signed in successfully', signUp: 'Account created successfully', signOut: 'Signed out', passwordResetSent: 'Password reset link sent to your email', passwordReset: 'Password reset successfully' },
			forgotPassword: {
				title: 'Forgot password?', subtitle: 'Enter your email and we will send you a reset link',
				submitButton: 'Send Reset Link', loadingButton: 'Sending...', backToSignIn: 'Back to sign in',
				emailSent: { title: 'Check your email', subtitle: 'We sent a password reset link to', resendPrompt: "Didn't receive the email?", resendLink: 'Click to resend' },
			},
			resetPassword: {
				title: 'Reset password', subtitle: 'Enter your new password below',
				submitButton: 'Reset Password', loadingButton: 'Resetting...',
				newPassword: { label: 'New Password', placeholder: 'Enter new password' },
				confirmNewPassword: { label: 'Confirm New Password', placeholder: 'Confirm new password' },
				success: { title: 'Password reset!', subtitle: 'Your password has been reset successfully', signInLink: 'Sign in with your new password' },
				invalidToken: 'Invalid or expired reset link. Please request a new one.',
			},
		},
		dashboard: {
			header: { searchPlaceholder: 'Search agents, tools...' },
			sidebar: { docsLink: 'View Docs' },
			home: {
				title: 'Dashboard', subtitle: 'Overview of your agents and usage', newAgentButton: 'New Agent',
				noAgents: { title: 'No agents yet', description: 'Create your first AI agent to get started.', cta: 'Create Agent' },
				recentAgents: { title: 'Recent Agents', subtitle: 'Ordered by last update', viewAll: 'View all', createNew: 'Create New Agent' },
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
			agents: { title: 'Agents', subtitle: 'Manage your AI agents', newButton: 'New Agent', status: { deployed: 'Live', draft: 'Draft', archived: 'Archived' } },
			tools: { title: 'Tools', subtitle: 'Configure agent capabilities' },
			usage: { title: 'Usage', subtitle: 'Monitor your API usage and costs' },
			settings: { title: 'Settings', subtitle: 'Manage your account and preferences' },
		},
		errors: {
			AUTH_REQUIRED: 'You must be signed in to access this resource',
			AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
			AUTH_SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
			AGENT_NOT_FOUND: 'Agent not found',
			AGENT_CREATE_FAILED: 'Failed to create agent',
			AGENT_UPDATE_FAILED: 'Failed to update agent',
			AGENT_DELETE_FAILED: 'Failed to delete agent',
			AGENT_DEPLOY_FAILED: 'Failed to deploy agent',
			AGENT_NOT_DEPLOYED: 'Agent must be deployed before testing',
			TOOL_NOT_FOUND: 'Tool not found',
			TOOL_CREATE_FAILED: 'Failed to create tool',
			TOOL_INVALID_TYPE: 'Invalid tool type',
			WORKSPACE_NOT_FOUND: 'Workspace not found',
			WORKSPACE_CREATE_FAILED: 'Failed to create workspace',
			WORKSPACE_REQUIRED: 'A workspace is required',
			CHAT_FAILED: 'Failed to send message',
			CHAT_STREAM_ERROR: 'Error in chat stream',
			NETWORK_ERROR: 'Network error. Please check your connection.',
			UNKNOWN_ERROR: 'An unexpected error occurred',
			VALIDATION_ERROR: 'Please check your input and try again',
			RATE_LIMITED: 'Too many requests. Please try again later.',
			SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
		},
		devTools: {
			title: 'Dev Tools', badge: 'DEV',
			sections: {
				auth: { title: 'Authentication', signIn: 'Sign In', signUp: 'New User', signOut: 'Sign Out' },
				quickCreate: { title: 'Quick Create', agent: 'Agent', workspace: 'Workspace' },
				cache: { title: 'Cache', refresh: 'Refresh', clear: 'Clear' },
			},
			agentNames: ['Hoppy Helper', 'Bunny Bot', 'Carrot Cruncher', 'Warren Wizard', 'Fluffy Assistant', 'Thumper AI', 'Cotton Tail', 'Jack Rabbit', 'Velvet Ears', 'Meadow Mind'],
			agentDescriptions: ['A speedy assistant that hops to help', 'Burrows deep into problems to find solutions', 'Quick as a hare, smart as a fox', 'Your friendly neighborhood rabbit helper', 'Nibbles through tasks with ease'],
			defaultInstructions: 'You are a helpful AI assistant with a playful rabbit personality. Be quick, helpful, and add occasional rabbit puns.',
			testUser: { email: 'test@example.com', password: 'password123' },
			logApiTiming: true,
			logStateChanges: true,
			apiDelay: 0,
		},
	},

	// =========================================================================
	// Defaults (commonly used default values)
	// =========================================================================
	defaults: {
		agentStatus: 'draft' as const,
		scheduleStatus: 'pending' as const,
		invitationStatus: 'pending' as const,
		workspaceRole: 'member' as const,
		memberRole: 'member' as const,
		exportFormat: 'json' as const,
		planId: 'free' as const,
		widgetPosition: 'bottom-right' as const,
	},
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

// Enum value types
export type AgentStatus = typeof config.enums.agentStatus[keyof typeof config.enums.agentStatus]
export type DeploymentStatus = typeof config.enums.deploymentStatus[keyof typeof config.enums.deploymentStatus]
export type ScheduleStatus = typeof config.enums.scheduleStatus[keyof typeof config.enums.scheduleStatus]
export type ExecutionStatus = typeof config.enums.executionStatus[keyof typeof config.enums.executionStatus]
export type InvitationStatus = typeof config.enums.invitationStatus[keyof typeof config.enums.invitationStatus]
export type WorkspaceRole = typeof config.enums.workspaceRole[keyof typeof config.enums.workspaceRole]
export type MemberRole = typeof config.enums.memberRole[keyof typeof config.enums.memberRole]
export type MessageRole = typeof config.enums.messageRole[keyof typeof config.enums.messageRole]
export type ScheduleType = typeof config.enums.scheduleType[keyof typeof config.enums.scheduleType]
export type ExportFormat = typeof config.enums.exportFormat[keyof typeof config.enums.exportFormat]
export type ToolType = typeof config.enums.toolType[keyof typeof config.enums.toolType]
export type ToolCategory = typeof config.enums.toolCategory[keyof typeof config.enums.toolCategory]
export type HttpMethod = typeof config.enums.httpMethod[keyof typeof config.enums.httpMethod]
export type NodeEnv = typeof config.enums.nodeEnv[keyof typeof config.enums.nodeEnv]
export type PlanId = typeof config.enums.planId[keyof typeof config.enums.planId]
export type WidgetPosition = typeof config.enums.widgetPosition[keyof typeof config.enums.widgetPosition]
export type AuditAction = typeof config.enums.auditAction[keyof typeof config.enums.auditAction]

// Re-export types used in config
export type { AIModel, SystemTool, ResponseStylePreset, AgentTemplate, ModelProvider, SpeedTier, CostTier, ResponseStyle, SystemToolType, AgentTemplateId }

// =============================================================================
// Helper Functions
// =============================================================================

export function getModelById(id: string): AIModel | undefined {
	return config.models.list.find((m) => m.id === id)
}

export function getModelName(id: string): string {
	return getModelById(id)?.name ?? id
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
export const AUDIT_ACTIONS = enumToTuple(config.enums.auditAction)

// API message roles (excludes tool)
export const API_MESSAGE_ROLES = [
	config.enums.messageRole.USER,
	config.enums.messageRole.ASSISTANT,
	config.enums.messageRole.SYSTEM,
] as const
