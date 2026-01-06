import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
	agentListModelsTool,
	agentListTemplatesTool,
	agentValidateConfigTool,
	agentExportConfigTool,
	agentSuggestToolsTool,
	agentBuilderTools,
	getAgentBuilderTools,
	AGENT_BUILDER_TOOL_IDS,
} from '../agent-builder'
import type { ToolContext } from '../types'

// Mock @hare/config module
vi.mock('@hare/config', () => ({
	config: {
		models: {
			list: [
				{
					id: 'claude-3-5-sonnet-20241022',
					name: 'Claude 3.5 Sonnet',
					description: 'Fast and intelligent',
					provider: 'anthropic',
					contextWindow: 200000,
					maxOutputTokens: 8192,
					supportsStreaming: true,
					supportsTools: true,
					speedTier: 'fast',
					costTier: 'medium',
					inputCostPer1M: 3,
					outputCostPer1M: 15,
				},
				{
					id: 'gpt-4o',
					name: 'GPT-4o',
					description: 'OpenAI flagship model',
					provider: 'openai',
					contextWindow: 128000,
					maxOutputTokens: 4096,
					supportsStreaming: true,
					supportsTools: true,
					speedTier: 'fast',
					costTier: 'high',
					inputCostPer1M: 5,
					outputCostPer1M: 15,
				},
				{
					id: 'llama-3-70b',
					name: 'Llama 3 70B',
					description: 'Open source model',
					provider: 'workers-ai',
					contextWindow: 8000,
					maxOutputTokens: 2048,
					supportsStreaming: true,
					supportsTools: false,
					speedTier: 'medium',
					costTier: 'free',
					inputCostPer1M: 0,
					outputCostPer1M: 0,
				},
			],
		},
		agents: {
			templates: [
				{
					id: 'customer-support',
					name: 'Customer Support Agent',
					description: 'Helps customers with their questions',
					icon: 'headphones',
					color: '#4A90D9',
					model: 'claude-3-5-sonnet-20241022',
					responseStyle: 'professional',
					suggestedToolTypes: ['http', 'kv'],
					instructions:
						'You are a helpful customer support agent. Be polite, professional, and helpful.',
				},
				{
					id: 'research-assistant',
					name: 'Research Assistant',
					description: 'Helps with research tasks',
					icon: 'search',
					color: '#6B8E23',
					model: 'gpt-4o',
					responseStyle: 'detailed',
					suggestedToolTypes: ['search', 'ai'],
					instructions: 'You are a research assistant. Provide detailed, well-sourced answers.',
				},
			],
		},
	},
	getModelById: vi.fn((id: string) => {
		const models = [
			{
				id: 'claude-3-5-sonnet-20241022',
				name: 'Claude 3.5 Sonnet',
				maxOutputTokens: 8192,
				costTier: 'medium',
			},
			{
				id: 'gpt-4o',
				name: 'GPT-4o',
				maxOutputTokens: 4096,
				costTier: 'high',
			},
			{
				id: 'llama-3-70b',
				name: 'Llama 3 70B',
				maxOutputTokens: 2048,
				costTier: 'free',
			},
		]
		return models.find((m) => m.id === id)
	}),
}))

const createMockContext = (): ToolContext => ({
	env: {} as ToolContext['env'],
	workspaceId: 'test-workspace',
	userId: 'test-user',
})

describe('Agent Builder Tools', () => {
	let context: ToolContext

	beforeEach(() => {
		context = createMockContext()
		vi.clearAllMocks()
	})

	describe('agentListModelsTool', () => {
		describe('schema validation', () => {
			it('has correct tool id and description', () => {
				expect(agentListModelsTool.id).toBe('agent_list_models')
				expect(agentListModelsTool.description).toContain('available AI models')
			})

			it('validates empty input', () => {
				const result = agentListModelsTool.inputSchema.safeParse({})
				expect(result.success).toBe(true)
			})

			it('validates with provider filter', () => {
				const result = agentListModelsTool.inputSchema.safeParse({ provider: 'anthropic' })
				expect(result.success).toBe(true)
			})

			it('validates with supportsTools filter', () => {
				const result = agentListModelsTool.inputSchema.safeParse({ supportsTools: true })
				expect(result.success).toBe(true)
			})

			it('rejects invalid provider', () => {
				const result = agentListModelsTool.inputSchema.safeParse({ provider: 'invalid' })
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('lists all models', async () => {
				const result = await agentListModelsTool.execute({}, context)

				expect(result.success).toBe(true)
				expect(result.data?.models).toHaveLength(3)
				expect(result.data?.total).toBe(3)
				expect(result.data?.providers).toContain('anthropic')
				expect(result.data?.providers).toContain('openai')
			})

			it('filters by provider', async () => {
				const result = await agentListModelsTool.execute({ provider: 'anthropic' }, context)

				expect(result.success).toBe(true)
				expect(result.data?.models).toHaveLength(1)
				expect(result.data?.models[0]?.provider).toBe('anthropic')
			})

			it('filters by tool support', async () => {
				const result = await agentListModelsTool.execute({ supportsTools: true }, context)

				expect(result.success).toBe(true)
				expect(result.data?.models.every((m) => m.supportsTools)).toBe(true)
			})

			it('returns model details', async () => {
				const result = await agentListModelsTool.execute({}, context)

				expect(result.success).toBe(true)
				const model = result.data?.models[0]
				expect(model).toHaveProperty('id')
				expect(model).toHaveProperty('name')
				expect(model).toHaveProperty('description')
				expect(model).toHaveProperty('provider')
				expect(model).toHaveProperty('contextWindow')
				expect(model).toHaveProperty('maxOutputTokens')
				expect(model).toHaveProperty('supportsStreaming')
				expect(model).toHaveProperty('supportsTools')
				expect(model).toHaveProperty('speedTier')
				expect(model).toHaveProperty('costTier')
				expect(model).toHaveProperty('inputCostPer1M')
				expect(model).toHaveProperty('outputCostPer1M')
			})
		})
	})

	describe('agentListTemplatesTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(agentListTemplatesTool.id).toBe('agent_list_templates')
			})

			it('validates empty input', () => {
				const result = agentListTemplatesTool.inputSchema.safeParse({})
				expect(result.success).toBe(true)
			})
		})

		describe('execution', () => {
			it('lists all templates', async () => {
				const result = await agentListTemplatesTool.execute({}, context)

				expect(result.success).toBe(true)
				expect(result.data?.templates).toHaveLength(2)
				expect(result.data?.total).toBe(2)
			})

			it('returns template details', async () => {
				const result = await agentListTemplatesTool.execute({}, context)

				expect(result.success).toBe(true)
				const template = result.data?.templates[0]
				expect(template).toHaveProperty('id')
				expect(template).toHaveProperty('name')
				expect(template).toHaveProperty('description')
				expect(template).toHaveProperty('icon')
				expect(template).toHaveProperty('color')
				expect(template).toHaveProperty('model')
				expect(template).toHaveProperty('responseStyle')
				expect(template).toHaveProperty('suggestedToolTypes')
				expect(template).toHaveProperty('instructionsPreview')
			})

			it('truncates long instructions preview', async () => {
				const result = await agentListTemplatesTool.execute({}, context)

				expect(result.success).toBe(true)
				const template = result.data?.templates[0]
				expect(template?.instructionsPreview.length).toBeLessThanOrEqual(203) // 200 + "..."
			})
		})
	})

	describe('agentValidateConfigTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(agentValidateConfigTool.id).toBe('agent_validate_config')
			})

			it('validates valid config', () => {
				const result = agentValidateConfigTool.inputSchema.safeParse({
					name: 'My Agent',
					instructions: 'You are a helpful assistant.',
					model: 'claude-3-5-sonnet-20241022',
				})
				expect(result.success).toBe(true)
			})

			it('validates config with all options', () => {
				const result = agentValidateConfigTool.inputSchema.safeParse({
					name: 'My Agent',
					description: 'A helpful agent',
					instructions: 'You are a helpful assistant.',
					model: 'claude-3-5-sonnet-20241022',
					config: { temperature: 0.7, maxTokens: 4096 },
					toolIds: ['kv_get', 'http_request'],
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty name', () => {
				const result = agentValidateConfigTool.inputSchema.safeParse({
					name: '',
					instructions: 'Instructions',
					model: 'claude-3-5-sonnet-20241022',
				})
				expect(result.success).toBe(false)
			})

			it('rejects empty instructions', () => {
				const result = agentValidateConfigTool.inputSchema.safeParse({
					name: 'My Agent',
					instructions: '',
					model: 'claude-3-5-sonnet-20241022',
				})
				expect(result.success).toBe(false)
			})

			it('rejects too many tools', () => {
				const result = agentValidateConfigTool.inputSchema.safeParse({
					name: 'My Agent',
					instructions: 'Instructions',
					model: 'claude-3-5-sonnet-20241022',
					toolIds: Array(21).fill('tool'),
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('validates valid configuration', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						instructions: 'You are a helpful assistant that helps users with their questions.',
						model: 'claude-3-5-sonnet-20241022',
						toolIds: ['kv_get', 'http_request'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(true)
				expect(result.data?.errors).toHaveLength(0)
			})

			it('returns error for unknown model', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						instructions: 'You are a helpful assistant.',
						model: 'unknown-model',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors.some((e) => e.includes('Unknown model'))).toBe(true)
			})

			it('returns warning for short instructions', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						instructions: 'Help',
						model: 'claude-3-5-sonnet-20241022',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.warnings.length).toBeGreaterThan(0)
			})

			it('returns warning for unknown tool IDs', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						instructions: 'You are a helpful assistant.',
						model: 'claude-3-5-sonnet-20241022',
						toolIds: ['kv_get', 'custom_unknown_tool'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.warnings.some((w) => w.includes('custom_unknown_tool'))).toBe(
					true,
				)
			})

			it('returns warning for high temperature', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						instructions: 'You are a helpful assistant.',
						model: 'claude-3-5-sonnet-20241022',
						config: { temperature: 1.8 },
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.warnings.some((w) => w.includes('High temperature'))).toBe(
					true,
				)
			})

			it('returns error when maxTokens exceeds model limit', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						instructions: 'You are a helpful assistant.',
						model: 'claude-3-5-sonnet-20241022',
						config: { maxTokens: 100000 },
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.valid).toBe(false)
				expect(result.data?.errors.some((e) => e.includes('maxTokens'))).toBe(true)
			})

			it('returns preview with configuration summary', async () => {
				const result = await agentValidateConfigTool.execute(
					{
						name: 'My Agent',
						description: 'A helpful agent',
						instructions: 'You are a helpful assistant.',
						model: 'claude-3-5-sonnet-20241022',
						toolIds: ['kv_get', 'http_request'],
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.preview).toEqual(
					expect.objectContaining({
						name: 'My Agent',
						description: 'A helpful agent',
						model: 'claude-3-5-sonnet-20241022',
						modelName: 'Claude 3.5 Sonnet',
						toolCount: 2,
					}),
				)
			})
		})
	})

	describe('agentExportConfigTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(agentExportConfigTool.id).toBe('agent_export_config')
			})

			it('validates JSON export', () => {
				const result = agentExportConfigTool.inputSchema.safeParse({
					config: {
						name: 'My Agent',
						instructions: 'Help users',
						model: 'claude-3-5-sonnet-20241022',
					},
					format: 'json',
				})
				expect(result.success).toBe(true)
			})

			it('validates TypeScript export', () => {
				const result = agentExportConfigTool.inputSchema.safeParse({
					config: {
						name: 'My Agent',
						instructions: 'Help users',
						model: 'claude-3-5-sonnet-20241022',
					},
					format: 'typescript',
				})
				expect(result.success).toBe(true)
			})

			it('validates cURL export', () => {
				const result = agentExportConfigTool.inputSchema.safeParse({
					config: {
						name: 'My Agent',
						instructions: 'Help users',
						model: 'claude-3-5-sonnet-20241022',
					},
					format: 'curl',
				})
				expect(result.success).toBe(true)
			})

			it('rejects invalid format', () => {
				const result = agentExportConfigTool.inputSchema.safeParse({
					config: {
						name: 'My Agent',
						instructions: 'Help users',
						model: 'claude-3-5-sonnet-20241022',
					},
					format: 'invalid',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('exports as JSON', async () => {
				const result = await agentExportConfigTool.execute(
					{
						config: {
							name: 'My Agent',
							description: 'A helpful agent',
							instructions: 'Help users',
							model: 'claude-3-5-sonnet-20241022',
							toolIds: ['kv_get'],
						},
						format: 'json',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.format).toBe('json')
				const exported = JSON.parse(result.data?.export || '')
				expect(exported.name).toBe('My Agent')
				expect(exported.model).toBe('claude-3-5-sonnet-20241022')
			})

			it('exports as TypeScript', async () => {
				const result = await agentExportConfigTool.execute(
					{
						config: {
							name: 'My Agent',
							instructions: 'Help users',
							model: 'claude-3-5-sonnet-20241022',
						},
						format: 'typescript',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.format).toBe('typescript')
				expect(result.data?.export).toContain('import { createAgent }')
				expect(result.data?.export).toContain('@hare/sdk')
				expect(result.data?.export).toContain('My Agent')
			})

			it('exports as cURL', async () => {
				const result = await agentExportConfigTool.execute(
					{
						config: {
							name: 'My Agent',
							instructions: 'Help users',
							model: 'claude-3-5-sonnet-20241022',
						},
						format: 'curl',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.format).toBe('curl')
				expect(result.data?.export).toContain('curl -X POST')
				expect(result.data?.export).toContain('api.hare.dev')
				expect(result.data?.export).toContain('YOUR_API_KEY')
			})

			it('includes instructions for each format', async () => {
				const jsonResult = await agentExportConfigTool.execute(
					{
						config: {
							name: 'Test',
							instructions: 'Test',
							model: 'claude-3-5-sonnet-20241022',
						},
						format: 'json',
					},
					context,
				)

				expect(jsonResult.data?.instructions).toBeTruthy()
				expect(jsonResult.data?.instructions.length).toBeGreaterThan(0)
			})
		})
	})

	describe('agentSuggestToolsTool', () => {
		describe('schema validation', () => {
			it('has correct tool id', () => {
				expect(agentSuggestToolsTool.id).toBe('agent_suggest_tools')
			})

			it('validates valid use case', () => {
				const result = agentSuggestToolsTool.inputSchema.safeParse({
					useCase: 'customer support bot',
				})
				expect(result.success).toBe(true)
			})

			it('validates with description', () => {
				const result = agentSuggestToolsTool.inputSchema.safeParse({
					useCase: 'data analysis',
					description: 'Analyzes CSV files and generates reports',
				})
				expect(result.success).toBe(true)
			})

			it('rejects empty use case', () => {
				const result = agentSuggestToolsTool.inputSchema.safeParse({
					useCase: 'ab',
				})
				expect(result.success).toBe(false)
			})
		})

		describe('execution', () => {
			it('suggests tools for customer support use case', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'customer support' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestedTools.length).toBeGreaterThan(0)
				expect(result.data?.categories.length).toBeGreaterThan(0)
			})

			it('suggests tools for data analysis use case', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'data analysis' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestedTools.some((t) => t.id === 'sql_query')).toBe(true)
			})

			it('suggests tools for automation use case', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'automation workflow' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestedTools.some((t) => t.id === 'zapier')).toBe(true)
			})

			it('suggests tools for code use case', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'code developer assistant' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestedTools.some((t) => t.id === 'code_execute')).toBe(true)
			})

			it('provides default suggestions for unknown use case', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'completely unique use case xyz' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestedTools.length).toBeGreaterThan(0)
				expect(result.data?.suggestedTools.some((t) => t.id === 'http_request')).toBe(true)
			})

			it('limits suggestions to 10 tools', async () => {
				const result = await agentSuggestToolsTool.execute(
					{
						useCase: 'customer support help desk knowledge base documentation',
					},
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.suggestedTools.length).toBeLessThanOrEqual(10)
			})

			it('includes reasoning in response', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'customer support' },
					context,
				)

				expect(result.success).toBe(true)
				expect(result.data?.reasoning).toBeTruthy()
				expect(result.data?.reasoning.length).toBeGreaterThan(0)
			})

			it('includes tool details in suggestions', async () => {
				const result = await agentSuggestToolsTool.execute(
					{ useCase: 'research' },
					context,
				)

				expect(result.success).toBe(true)
				const tool = result.data?.suggestedTools[0]
				expect(tool).toHaveProperty('id')
				expect(tool).toHaveProperty('name')
				expect(tool).toHaveProperty('category')
				expect(tool).toHaveProperty('reason')
			})
		})
	})

	describe('agentBuilderTools array', () => {
		it('contains all agent builder tools', () => {
			expect(agentBuilderTools).toHaveLength(5)
			expect(agentBuilderTools.map((t) => t.id)).toEqual([
				'agent_list_models',
				'agent_list_templates',
				'agent_validate_config',
				'agent_export_config',
				'agent_suggest_tools',
			])
		})
	})

	describe('AGENT_BUILDER_TOOL_IDS constant', () => {
		it('contains all agent builder tool IDs', () => {
			expect(AGENT_BUILDER_TOOL_IDS).toEqual([
				'agent_list_models',
				'agent_list_templates',
				'agent_validate_config',
				'agent_export_config',
				'agent_suggest_tools',
			])
		})

		it('matches agentBuilderTools array', () => {
			expect([...AGENT_BUILDER_TOOL_IDS]).toEqual(agentBuilderTools.map((t) => t.id))
		})
	})

	describe('getAgentBuilderTools', () => {
		it('returns agent builder tools plus agent control tools', () => {
			const tools = getAgentBuilderTools(context)

			// Should include agent builder tools
			expect(tools.some((t) => t.id === 'agent_list_models')).toBe(true)
			expect(tools.some((t) => t.id === 'agent_validate_config')).toBe(true)

			// Should also include agent control tools (from getAgentControlTools)
			// The exact count depends on how many agent control tools exist
			expect(tools.length).toBeGreaterThanOrEqual(5)
		})
	})
})
