/**
 * Agent Builder Tools
 *
 * Specialized tools for the Agent Builder meta-agent that helps users
 * create and configure other agents through natural conversation.
 */

import { config, getModelById } from '@hare/config'
import { z } from 'zod'
import { getAgentControlTools } from './agent-control'
import { type AnyTool, createTool, failure, success, type ToolContext } from './types'

/**
 * System tool IDs for validation (subset of commonly used tools).
 * Full list is in index.ts - this is duplicated here to avoid circular imports.
 * Using a Set for O(1) lookup and type-safe membership checking.
 */
const KNOWN_SYSTEM_TOOL_IDS = new Set([
	// Cloudflare native
	'kv_get',
	'kv_put',
	'kv_delete',
	'kv_list',
	'r2_get',
	'r2_put',
	'r2_delete',
	'r2_list',
	'r2_head',
	'sql_query',
	'sql_execute',
	'sql_batch',
	'http_request',
	'http_get',
	'http_post',
	'ai_search',
	'ai_search_answer',
	// Utility
	'datetime',
	'json',
	'text',
	'math',
	'uuid',
	'hash',
	'base64',
	'url',
	'delay',
	// Integrations
	'zapier',
	'webhook',
	// AI
	'sentiment',
	'summarize',
	'translate',
	'image_generate',
	'classify',
	'ner',
	'embedding',
	'question_answer',
	// Data
	'rss',
	'scrape',
	'regex',
	'crypto',
	'json_schema',
	'csv',
	'template',
	// Sandbox
	'code_execute',
	'code_validate',
	'sandbox_file',
	// Validation
	'validate_email',
	'validate_phone',
	'validate_url',
	'validate_credit_card',
	'validate_ip',
	'validate_json',
	// Transform
	'markdown',
	'diff',
	'qrcode',
	'compression',
	'color',
	// Memory
	'recall_memory',
	'store_memory',
])

// =============================================================================
// Output Schemas
// =============================================================================

const ModelInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	provider: z.string(),
	contextWindow: z.number(),
	maxOutputTokens: z.number(),
	supportsStreaming: z.boolean(),
	supportsTools: z.boolean(),
	speedTier: z.string(),
	costTier: z.string(),
	inputCostPer1M: z.number(),
	outputCostPer1M: z.number(),
})

const ListModelsOutputSchema = z.object({
	models: z.array(ModelInfoSchema),
	total: z.number(),
	providers: z.array(z.string()),
})

const TemplateInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	color: z.string(),
	model: z.string(),
	responseStyle: z.string(),
	suggestedToolTypes: z.array(z.string()),
	instructionsPreview: z.string(),
})

const ListTemplatesOutputSchema = z.object({
	templates: z.array(TemplateInfoSchema),
	total: z.number(),
})

const ValidationResultSchema = z.object({
	valid: z.boolean(),
	errors: z.array(z.string()),
	warnings: z.array(z.string()),
	preview: z.object({
		name: z.string(),
		description: z.string().nullable(),
		model: z.string(),
		modelName: z.string(),
		instructionsLength: z.number(),
		toolCount: z.number(),
		estimatedCost: z.string(),
	}),
})

const ExportConfigOutputSchema = z.object({
	format: z.string(),
	export: z.string(),
	instructions: z.string(),
})

const ToolSuggestionSchema = z.object({
	id: z.string(),
	name: z.string(),
	category: z.string(),
	reason: z.string(),
})

const SuggestToolsOutputSchema = z.object({
	suggestedTools: z.array(ToolSuggestionSchema),
	categories: z.array(z.string()),
	reasoning: z.string(),
})

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * List all available AI models with their capabilities and costs.
 */
export const agentListModelsTool = createTool({
	id: 'agent_list_models',
	description:
		'List all available AI models with their capabilities, costs, speed tiers, and context windows. Use this to help users choose the right model for their agent.',
	inputSchema: z.object({
		provider: z
			.enum(['anthropic', 'openai', 'workers-ai'])
			.optional()
			.describe('Filter by provider (optional)'),
		supportsTools: z.boolean().optional().describe('Only show models that support tool calling'),
	}),
	outputSchema: ListModelsOutputSchema,
	execute: async (params, _context: ToolContext) => {
		try {
			let models = [...config.models.list]

			// Filter by provider if specified
			if (params.provider) {
				models = models.filter((m) => m.provider === params.provider)
			}

			// Filter by tool support if specified
			if (params.supportsTools !== undefined) {
				models = models.filter((m) => m.supportsTools === params.supportsTools)
			}

			const providers = [...new Set(models.map((m) => m.provider))]

			return success({
				models: models.map((m) => ({
					id: m.id,
					name: m.name,
					description: m.description,
					provider: m.provider,
					contextWindow: m.contextWindow,
					maxOutputTokens: m.maxOutputTokens,
					supportsStreaming: m.supportsStreaming,
					supportsTools: m.supportsTools,
					speedTier: m.speedTier,
					costTier: m.costTier,
					inputCostPer1M: m.inputCostPer1M,
					outputCostPer1M: m.outputCostPer1M,
				})),
				total: models.length,
				providers,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to list models')
		}
	},
})

/**
 * List all pre-built agent templates.
 */
export const agentListTemplatesTool = createTool({
	id: 'agent_list_templates',
	description:
		'List all pre-built agent templates that can be used as starting points. Templates include instructions, suggested tools, and model configurations.',
	inputSchema: z.object({}),
	outputSchema: ListTemplatesOutputSchema,
	execute: async (_params, _context: ToolContext) => {
		try {
			const templates = config.agents.templates.map((t) => ({
				id: t.id,
				name: t.name,
				description: t.description,
				icon: t.icon,
				color: t.color,
				model: t.model,
				responseStyle: t.responseStyle,
				suggestedToolTypes: [...t.suggestedToolTypes],
				// Provide a preview of instructions (first 200 chars)
				instructionsPreview:
					t.instructions.length > 200 ? `${t.instructions.slice(0, 200)}...` : t.instructions,
			}))

			return success({
				templates,
				total: templates.length,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to list templates')
		}
	},
})

/**
 * Validate agent configuration before creation.
 */
export const agentValidateConfigTool = createTool({
	id: 'agent_validate_config',
	description:
		'Validate an agent configuration before creation. Returns errors, warnings, and a preview of what will be created.',
	inputSchema: z.object({
		name: z.string().min(1).max(100).describe('Agent name (1-100 characters)'),
		description: z.string().max(500).optional().describe('Agent description (max 500 chars)'),
		instructions: z.string().min(1).max(10000).describe('System instructions (1-10000 characters)'),
		model: z.string().describe('Model ID to use'),
		config: z
			.object({
				temperature: z.number().min(0).max(2).optional(),
				maxTokens: z.number().min(1).max(128000).optional(),
				topP: z.number().min(0).max(1).optional(),
				topK: z.number().min(0).optional(),
			})
			.optional()
			.describe('Model configuration parameters'),
		toolIds: z.array(z.string()).max(20).optional().describe('Tool IDs to attach (max 20)'),
	}),
	outputSchema: ValidationResultSchema,
	execute: async (params, _context: ToolContext) => {
		try {
			const errors: string[] = []
			const warnings: string[] = []

			// Validate model exists
			const model = getModelById(params.model)
			if (!model) {
				errors.push(
					`Unknown model: ${params.model}. Use agent_list_models to see available models.`,
				)
			}

			// Validate name
			if (params.name.trim().length === 0) {
				errors.push('Agent name cannot be empty or whitespace only')
			}

			// Validate instructions
			if (params.instructions.trim().length < 10) {
				warnings.push(
					"Instructions are very short. Consider adding more detail about the agent's role and behavior.",
				)
			}

			// Check for common instruction issues
			if (!params.instructions.toLowerCase().includes('you')) {
				warnings.push(
					'Consider starting instructions with "You are..." to clearly define the agent\'s role.',
				)
			}

			// Validate tool count
			if (params.toolIds && params.toolIds.length > 20) {
				errors.push('Maximum 20 tools can be attached to an agent')
			}

			// Check for unknown tools
			if (params.toolIds) {
				const unknownTools = params.toolIds.filter((id) => !KNOWN_SYSTEM_TOOL_IDS.has(id))
				if (unknownTools.length > 0) {
					warnings.push(`Unknown tool IDs (may be custom tools): ${unknownTools.join(', ')}`)
				}
			}

			// Validate config parameters
			if (params.config) {
				if (params.config.temperature !== undefined) {
					if (params.config.temperature > 1.5) {
						warnings.push(
							'High temperature (>1.5) may produce inconsistent or incoherent responses',
						)
					}
				}
				if (params.config.maxTokens !== undefined && model) {
					if (params.config.maxTokens > model.maxOutputTokens) {
						errors.push(
							`maxTokens (${params.config.maxTokens}) exceeds model limit (${model.maxOutputTokens})`,
						)
					}
				}
			}

			// Estimate cost tier
			let estimatedCost = 'Unknown'
			if (model) {
				estimatedCost = model.costTier === 'free' ? 'Free' : `${model.costTier} cost tier`
			}

			return success({
				valid: errors.length === 0,
				errors,
				warnings,
				preview: {
					name: params.name,
					description: params.description || null,
					model: params.model,
					modelName: model?.name || 'Unknown',
					instructionsLength: params.instructions.length,
					toolCount: params.toolIds?.length || 0,
					estimatedCost,
				},
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to validate config')
		}
	},
})

/**
 * Export agent configuration in various formats.
 */
export const agentExportConfigTool = createTool({
	id: 'agent_export_config',
	description:
		'Export agent configuration as JSON, TypeScript SDK code, or cURL command. Useful for version control, sharing, or programmatic creation.',
	inputSchema: z.object({
		config: z
			.object({
				name: z.string(),
				description: z.string().optional(),
				instructions: z.string(),
				model: z.string(),
				config: z
					.object({
						temperature: z.number().optional(),
						maxTokens: z.number().optional(),
						topP: z.number().optional(),
						topK: z.number().optional(),
					})
					.optional(),
				toolIds: z.array(z.string()).optional(),
			})
			.describe('Agent configuration to export'),
		format: z
			.enum(['json', 'typescript', 'curl'])
			.describe('Export format: json, typescript (SDK code), or curl (API command)'),
	}),
	outputSchema: ExportConfigOutputSchema,
	execute: async (params, _context: ToolContext) => {
		try {
			const { config, format } = params
			let exportContent: string
			let instructions: string

			switch (format) {
				case 'json':
					exportContent = JSON.stringify(
						{
							name: config.name,
							description: config.description,
							instructions: config.instructions,
							model: config.model,
							config: config.config,
							toolIds: config.toolIds,
							status: 'draft',
						},
						null,
						2,
					)
					instructions =
						'Save this JSON and use it with the Hare API or import it in the dashboard.'
					break

				case 'typescript':
					exportContent = `import { createAgent } from '@hare/sdk'

const agent = await createAgent({
  name: ${JSON.stringify(config.name)},
  description: ${JSON.stringify(config.description || '')},
  instructions: \`${config.instructions.replace(/`/g, '\\`')}\`,
  model: ${JSON.stringify(config.model)},
  config: ${JSON.stringify(config.config || {}, null, 2).replace(/\n/g, '\n  ')},
  toolIds: ${JSON.stringify(config.toolIds || [])},
})

console.log('Created agent:', agent.id)`
					instructions = 'Install @hare/sdk, then run this code with your API key configured.'
					break

				case 'curl':
					exportContent = `curl -X POST https://api.hare.dev/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
		name: config.name,
		description: config.description,
		instructions: config.instructions,
		model: config.model,
		config: config.config,
		toolIds: config.toolIds,
	})}'`
					instructions = 'Replace YOUR_API_KEY with your actual API key and run this command.'
					break

				default:
					return failure(`Unknown format: ${format}`)
			}

			return success({
				format,
				export: exportContent,
				instructions,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to export config')
		}
	},
})

/**
 * Tool suggestions mapped by use case keywords.
 */
const TOOL_SUGGESTIONS: Record<string, { tools: string[]; category: string; reason: string }[]> = {
	// Customer service keywords
	'customer support': [
		{
			tools: ['http_request', 'http_get'],
			category: 'http',
			reason: 'Fetch customer data from APIs',
		},
		{ tools: ['sql_query'], category: 'database', reason: 'Look up orders, tickets, user info' },
		{ tools: ['kv_get', 'kv_put'], category: 'storage', reason: 'Store session data, preferences' },
	],
	'help desk': [
		{ tools: ['sql_query'], category: 'database', reason: 'Query ticket database' },
		{ tools: ['http_request'], category: 'http', reason: 'Integrate with ticketing systems' },
		{ tools: ['sentiment'], category: 'ai', reason: 'Detect customer frustration' },
	],
	// Knowledge/docs keywords
	'knowledge base': [
		{
			tools: ['ai_search', 'ai_search_answer'],
			category: 'search',
			reason: 'Search documentation',
		},
		{ tools: ['r2_get'], category: 'storage', reason: 'Retrieve document content' },
		{ tools: ['summarize'], category: 'ai', reason: 'Summarize long documents' },
	],
	documentation: [
		{ tools: ['ai_search', 'ai_search_answer'], category: 'search', reason: 'Semantic doc search' },
		{ tools: ['markdown'], category: 'transform', reason: 'Format responses as markdown' },
	],
	// Data analysis keywords
	'data analysis': [
		{ tools: ['sql_query', 'sql_execute'], category: 'database', reason: 'Query and analyze data' },
		{ tools: ['csv'], category: 'data', reason: 'Parse and generate CSV reports' },
		{ tools: ['json'], category: 'utility', reason: 'Transform data structures' },
		{ tools: ['math'], category: 'utility', reason: 'Perform calculations' },
	],
	analytics: [
		{ tools: ['sql_query'], category: 'database', reason: 'Query metrics database' },
		{ tools: ['http_request'], category: 'http', reason: 'Fetch from analytics APIs' },
		{ tools: ['template'], category: 'data', reason: 'Generate reports' },
	],
	// Automation keywords
	automation: [
		{
			tools: ['zapier', 'webhook'],
			category: 'integrations',
			reason: 'Connect to external services',
		},
		{ tools: ['http_request'], category: 'http', reason: 'Call APIs' },
		{ tools: ['code_execute'], category: 'sandbox', reason: 'Run custom logic' },
	],
	workflow: [
		{ tools: ['zapier'], category: 'integrations', reason: 'Trigger workflow automations' },
		{ tools: ['webhook'], category: 'integrations', reason: 'Send webhook notifications' },
		{ tools: ['delay'], category: 'utility', reason: 'Add delays between steps' },
	],
	// Content keywords
	'content creation': [
		{ tools: ['summarize'], category: 'ai', reason: 'Summarize source material' },
		{ tools: ['translate'], category: 'ai', reason: 'Multi-language support' },
		{ tools: ['markdown'], category: 'transform', reason: 'Format content' },
		{ tools: ['image_generate'], category: 'ai', reason: 'Generate images' },
	],
	writing: [
		{ tools: ['summarize'], category: 'ai', reason: 'Create summaries' },
		{ tools: ['text'], category: 'utility', reason: 'Text manipulation' },
		{ tools: ['template'], category: 'data', reason: 'Use templates' },
	],
	// Sales keywords
	sales: [
		{ tools: ['http_request'], category: 'http', reason: 'CRM integration' },
		{ tools: ['sql_query'], category: 'database', reason: 'Query customer/product data' },
		{ tools: ['validate_email'], category: 'validation', reason: 'Validate lead emails' },
	],
	// Research keywords
	research: [
		{ tools: ['scrape'], category: 'data', reason: 'Extract web content' },
		{ tools: ['rss'], category: 'data', reason: 'Monitor news feeds' },
		{ tools: ['summarize'], category: 'ai', reason: 'Summarize findings' },
		{ tools: ['ai_search'], category: 'search', reason: 'Search knowledge base' },
	],
	// Code/dev keywords
	code: [
		{
			tools: ['code_execute', 'code_validate'],
			category: 'sandbox',
			reason: 'Execute and validate code',
		},
		{ tools: ['diff'], category: 'transform', reason: 'Compare code versions' },
		{ tools: ['regex'], category: 'data', reason: 'Pattern matching' },
	],
	developer: [
		{ tools: ['code_execute'], category: 'sandbox', reason: 'Run code snippets' },
		{ tools: ['http_request'], category: 'http', reason: 'Test APIs' },
		{ tools: ['json'], category: 'utility', reason: 'Parse/format JSON' },
	],
}

/**
 * Suggest tools based on use case.
 */
export const agentSuggestToolsTool = createTool({
	id: 'agent_suggest_tools',
	description:
		'Suggest appropriate tools based on the agent use case. Analyzes the use case description and recommends relevant tools with explanations.',
	inputSchema: z.object({
		useCase: z
			.string()
			.min(3)
			.describe('The use case or purpose of the agent (e.g., "customer support bot")'),
		description: z
			.string()
			.optional()
			.describe('Additional details about what the agent needs to do'),
	}),
	outputSchema: SuggestToolsOutputSchema,
	execute: async (params, _context: ToolContext) => {
		try {
			const searchText = `${params.useCase} ${params.description || ''}`.toLowerCase()
			const suggestedTools: Array<{
				id: string
				name: string
				category: string
				reason: string
			}> = []
			const categories = new Set<string>()
			const addedTools = new Set<string>()

			// Match against known use cases
			for (const [keyword, suggestions] of Object.entries(TOOL_SUGGESTIONS)) {
				if (searchText.includes(keyword)) {
					for (const suggestion of suggestions) {
						for (const toolId of suggestion.tools) {
							if (!addedTools.has(toolId)) {
								addedTools.add(toolId)
								categories.add(suggestion.category)
								suggestedTools.push({
									id: toolId,
									name: toolId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
									category: suggestion.category,
									reason: suggestion.reason,
								})
							}
						}
					}
				}
			}

			// Default suggestions if no matches
			if (suggestedTools.length === 0) {
				suggestedTools.push(
					{
						id: 'http_request',
						name: 'HTTP Request',
						category: 'http',
						reason: 'General-purpose API integration',
					},
					{
						id: 'kv_get',
						name: 'KV Get',
						category: 'storage',
						reason: 'Store and retrieve data',
					},
					{
						id: 'json',
						name: 'JSON',
						category: 'utility',
						reason: 'Parse and manipulate data',
					},
				)
				categories.add('http')
				categories.add('storage')
				categories.add('utility')
			}

			// Limit to top 10 suggestions
			const limitedSuggestions = suggestedTools.slice(0, 10)

			// Generate reasoning
			const reasoning =
				suggestedTools.length > 0
					? `Based on the "${params.useCase}" use case, I recommend ${limitedSuggestions.length} tools across ${categories.size} categories. These tools will help your agent ${
							params.useCase.includes('support')
								? 'assist customers effectively'
								: params.useCase.includes('data')
									? 'process and analyze data'
									: params.useCase.includes('content')
										? 'create and manage content'
										: 'accomplish its goals'
						}.`
					: 'No specific tool matches found. Showing general-purpose recommendations.'

			return success({
				suggestedTools: limitedSuggestions,
				categories: [...categories],
				reasoning,
			})
		} catch (error) {
			return failure(error instanceof Error ? error.message : 'Failed to suggest tools')
		}
	},
})

// =============================================================================
// Tool Aggregation
// =============================================================================

/**
 * All agent builder tools (just the new ones).
 */
export const agentBuilderTools: AnyTool[] = [
	agentListModelsTool,
	agentListTemplatesTool,
	agentValidateConfigTool,
	agentExportConfigTool,
	agentSuggestToolsTool,
]

/**
 * Agent builder tool IDs.
 */
export const AGENT_BUILDER_TOOL_IDS = [
	'agent_list_models',
	'agent_list_templates',
	'agent_validate_config',
	'agent_export_config',
	'agent_suggest_tools',
] as const

export type AgentBuilderToolId = (typeof AGENT_BUILDER_TOOL_IDS)[number]

/**
 * Get all tools for the Agent Builder agent.
 * Includes both builder-specific tools and agent-control tools.
 */
export function getAgentBuilderTools(context: ToolContext): AnyTool[] {
	return [
		// Agent builder specific tools
		...agentBuilderTools,
		// Agent control tools (create, configure, list, etc.)
		...getAgentControlTools(context),
	]
}
