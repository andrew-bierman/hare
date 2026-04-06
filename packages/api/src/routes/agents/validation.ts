/**
 * Agent validation operations (validate, preview)
 */

import { config, getModelById, isSystemToolId } from '@hare/config'
import { tools as toolsTable } from '@hare/db/schema'
import type { WorkspaceEnv } from '@hare/types'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { commonResponses } from '../../helpers'
import { authMiddleware, workspaceMiddleware } from '../../middleware'
import {
	AGENT_VALIDATION,
	AgentConfigSchema,
	AgentPreviewInputSchema,
	AgentPreviewResponseSchema,
	ALLOWED_MODEL_IDS,
	ErrorSchema,
	IdParamSchema,
} from '../../schemas'
import type { AllowedModelId } from '../../schemas/agents'
import { validateAgentInstructions } from '../../utils/sanitize'
import { findAgentByIdAndWorkspace, getAgentToolIds } from './helpers'

// =============================================================================
// Validation Schemas
// =============================================================================

const ValidationIssueSchema = z.object({
	field: z.string().describe('Field that has the issue'),
	type: z.enum(['error', 'warning']).describe('Issue severity'),
	message: z.string().describe('Issue description'),
})

const ModelPreviewSchema = z.object({
	id: z.string().describe('Model ID'),
	name: z.string().describe('Human-readable model name'),
	provider: z.string().describe('Model provider'),
	contextWindow: z.number().describe('Maximum context window size'),
	maxOutputTokens: z.number().describe('Maximum output tokens'),
	supportsTools: z.boolean().describe('Whether model supports tool calling'),
	estimatedCostPer1KTokens: z.number().describe('Estimated cost per 1K tokens'),
})

const ConfigPreviewSchema = z.object({
	temperature: z.number().describe('Effective temperature'),
	maxTokens: z.number().describe('Effective max tokens'),
	topP: z.number().optional().describe('Effective top-p if set'),
	topK: z.number().optional().describe('Effective top-k if set'),
})

const ValidationResponseSchema = z.object({
	valid: z.boolean().describe('Whether the configuration is valid for deployment'),
	errors: z.array(ValidationIssueSchema).describe('Blocking errors that must be fixed'),
	warnings: z.array(ValidationIssueSchema).describe('Non-blocking warnings'),
	preview: z
		.object({
			name: z.string().describe('Agent name'),
			description: z.string().nullable().describe('Agent description'),
			model: ModelPreviewSchema.describe('Resolved model information'),
			config: ConfigPreviewSchema.describe('Effective configuration with defaults'),
			toolCount: z.number().describe('Number of tools attached'),
			toolsValid: z.boolean().describe('Whether all tools are valid'),
			instructionsLength: z.number().describe('Length of instructions'),
			estimatedTokens: z.number().describe('Estimated instruction token count'),
			readyForDeployment: z.boolean().describe('Whether agent can be deployed'),
		})
		.optional()
		.describe('Preview of the resolved configuration (only if no critical errors)'),
})

const ValidateConfigSchema = z
	.object({
		name: z.string().optional().describe('Agent name'),
		description: z.string().optional().describe('Agent description'),
		model: z.string().optional().describe('Model ID'),
		instructions: z.string().optional().describe('Agent instructions'),
		config: AgentConfigSchema.optional().describe('Model configuration'),
		toolIds: z.array(z.string()).optional().describe('Tool IDs to attach'),
	})
	.openapi('ValidateConfig')

// =============================================================================
// Route Definitions
// =============================================================================

const validateConfigRoute = createRoute({
	method: 'post',
	path: '/validate',
	tags: ['Agents'],
	summary: 'Validate agent configuration',
	description:
		'Validates agent configuration and returns detailed feedback with a preview of the resolved settings',
	request: {
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: ValidateConfigSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Validation results',
			content: {
				'application/json': {
					schema: ValidationResponseSchema,
				},
			},
		},
		...commonResponses,
	},
})

const previewAgentRoute = createRoute({
	method: 'post',
	path: '/{id}/preview',
	tags: ['Agents'],
	summary: 'Preview agent configuration',
	description:
		'Validates agent configuration with optional overrides and returns detailed feedback for deployment readiness',
	request: {
		params: IdParamSchema,
		query: z.object({
			workspaceId: z.string().describe('Workspace ID'),
		}),
		body: {
			content: {
				'application/json': {
					schema: AgentPreviewInputSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Preview results with validation status',
			content: {
				'application/json': {
					schema: AgentPreviewResponseSchema,
				},
			},
		},
		404: {
			description: 'Agent not found',
			content: { 'application/json': { schema: ErrorSchema } },
		},
		...commonResponses,
	},
})

// =============================================================================
// Shared Types
// =============================================================================

type ValidationIssue = { field: string; type: 'error' | 'warning'; message: string }

type ConfigPreview = {
	name: string
	description: string | null
	model: {
		id: string
		name: string
		provider: string
		contextWindow: number
		maxOutputTokens: number
		supportsTools: boolean
		estimatedCostPer1KTokens: number
	}
	config: {
		temperature: number
		maxTokens: number
		topP?: number
		topK?: number
	}
	toolCount: number
	toolsValid: boolean
	instructionsLength: number
	estimatedTokens: number
	readyForDeployment: boolean
}

// =============================================================================
// App and Route Handlers
// =============================================================================

const baseApp = new OpenAPIHono<WorkspaceEnv>()

baseApp.use('*', authMiddleware)
baseApp.use('*', workspaceMiddleware)

export const validationApp = baseApp
	.openapi(validateConfigRoute, async (c) => {
		const data = c.req.valid('json')
		const db = getDb(c)
		const workspace = c.get('workspace')

		const errors: ValidationIssue[] = []
		const warnings: ValidationIssue[] = []

		// Validate name
		if (data.name !== undefined) {
			if (data.name.length < config.agents.limits.nameMinLength) {
				errors.push({
					field: 'name',
					type: 'error',
					message: `Name must be at least ${config.agents.limits.nameMinLength} character`,
				})
			}
			if (data.name.length > config.agents.limits.nameMaxLength) {
				errors.push({
					field: 'name',
					type: 'error',
					message: `Name must be at most ${config.agents.limits.nameMaxLength} characters`,
				})
			}
		} else {
			errors.push({
				field: 'name',
				type: 'error',
				message: 'Name is required',
			})
		}

		// Validate description
		if (data.description && data.description.length > config.agents.limits.descriptionMaxLength) {
			warnings.push({
				field: 'description',
				type: 'warning',
				message: `Description exceeds recommended length of ${config.agents.limits.descriptionMaxLength} characters`,
			})
		}

		// Validate model
		let modelInfo = null
		if (data.model) {
			modelInfo = getModelById(data.model)
			if (!modelInfo) {
				errors.push({
					field: 'model',
					type: 'error',
					message: `Unknown model: ${data.model}. Available models: ${config.models.list.map((m) => m.id).join(', ')}`,
				})
			} else if (!modelInfo.supportsTools && data.toolIds && data.toolIds.length > 0) {
				warnings.push({
					field: 'model',
					type: 'warning',
					message: `Model ${modelInfo.name} does not support tool calling. Tools will be ignored.`,
				})
			}
		} else {
			errors.push({
				field: 'model',
				type: 'error',
				message: 'Model is required',
			})
		}

		// Validate instructions
		let instructionsLength = 0
		let estimatedTokens = 0
		if (data.instructions !== undefined) {
			instructionsLength = data.instructions.length

			if (instructionsLength === 0) {
				errors.push({
					field: 'instructions',
					type: 'error',
					message: 'Instructions are required for deployment',
				})
			} else if (instructionsLength > config.agents.limits.instructionsMaxLength) {
				errors.push({
					field: 'instructions',
					type: 'error',
					message: `Instructions exceed maximum length of ${config.agents.limits.instructionsMaxLength} characters`,
				})
			}

			estimatedTokens = Math.ceil(instructionsLength / 4)

			if (modelInfo && estimatedTokens > modelInfo.contextWindow * 0.5) {
				warnings.push({
					field: 'instructions',
					type: 'warning',
					message: `Instructions may use more than 50% of the model's context window (${modelInfo.contextWindow} tokens)`,
				})
			}

			const instructionValidation = validateAgentInstructions(data.instructions)
			if (!instructionValidation.valid) {
				for (const issue of instructionValidation.issues) {
					warnings.push({
						field: 'instructions',
						type: 'warning',
						message: issue,
					})
				}
			}
		} else {
			errors.push({
				field: 'instructions',
				type: 'error',
				message: 'Instructions are required',
			})
		}

		// Validate config parameters
		if (data.config) {
			if (data.config.temperature !== undefined) {
				if (data.config.temperature < 0 || data.config.temperature > 2) {
					errors.push({
						field: 'config.temperature',
						type: 'error',
						message: 'Temperature must be between 0 and 2',
					})
				}
				if (data.config.temperature > 1.5) {
					warnings.push({
						field: 'config.temperature',
						type: 'warning',
						message: 'High temperature (>1.5) may produce inconsistent results',
					})
				}
			}

			if (data.config.maxTokens !== undefined) {
				if (modelInfo && data.config.maxTokens > modelInfo.maxOutputTokens) {
					errors.push({
						field: 'config.maxTokens',
						type: 'error',
						message: `Max tokens (${data.config.maxTokens}) exceeds model limit (${modelInfo.maxOutputTokens})`,
					})
				}
			}
		}

		// Validate tools
		let toolsValid = true
		const toolIds = data.toolIds || []

		if (toolIds.length > config.agents.limits.maxToolsPerAgent) {
			errors.push({
				field: 'toolIds',
				type: 'error',
				message: `Too many tools. Maximum is ${config.agents.limits.maxToolsPerAgent}`,
			})
			toolsValid = false
		}

		const customToolIds = toolIds.filter((id) => !isSystemToolId(id))
		if (customToolIds.length > 0) {
			const existingTools = await db
				.select({ id: toolsTable.id })
				.from(toolsTable)
				.where(eq(toolsTable.workspaceId, workspace.id))

			const existingToolIds = new Set(existingTools.map((t) => t.id))
			const missingTools = customToolIds.filter((id) => !existingToolIds.has(id))

			if (missingTools.length > 0) {
				errors.push({
					field: 'toolIds',
					type: 'error',
					message: `Unknown tools: ${missingTools.join(', ')}`,
				})
				toolsValid = false
			}
		}

		// Build response
		const isValid = errors.length === 0

		let preview: ConfigPreview | undefined
		if (data.name && modelInfo) {
			const effectiveConfig = {
				temperature: data.config?.temperature ?? 0.7,
				maxTokens: data.config?.maxTokens ?? 4096,
				...(data.config?.topP !== undefined && { topP: data.config.topP }),
				...(data.config?.topK !== undefined && { topK: data.config.topK }),
			}

			const avgCostPer1M = (modelInfo.inputCostPer1M + modelInfo.outputCostPer1M) / 2
			const estimatedCostPer1KTokens = avgCostPer1M / 1000

			preview = {
				name: data.name,
				description: data.description ?? null,
				model: {
					id: modelInfo.id,
					name: modelInfo.name,
					provider: modelInfo.provider,
					contextWindow: modelInfo.contextWindow,
					maxOutputTokens: modelInfo.maxOutputTokens,
					supportsTools: modelInfo.supportsTools,
					estimatedCostPer1KTokens,
				},
				config: effectiveConfig,
				toolCount: toolIds.length,
				toolsValid,
				instructionsLength,
				estimatedTokens,
				readyForDeployment: isValid && instructionsLength > 0,
			}
		}

		return c.json(
			{
				valid: isValid,
				errors,
				warnings,
				preview,
			},
			200,
		)
	})
	.openapi(previewAgentRoute, async (c) => {
		const { id } = c.req.valid('param')
		const overrides = c.req.valid('json')
		const db = getDb(c)
		const workspace = c.get('workspace')

		const agent = await findAgentByIdAndWorkspace({ db, id, workspaceId: workspace.id })
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404)
		}

		// Merge agent data with overrides
		const effectiveName = overrides.name ?? agent.name
		const effectiveDescription = overrides.description ?? agent.description
		const effectiveModel = overrides.model ?? agent.model
		const effectiveInstructions = overrides.instructions ?? agent.instructions
		const effectiveConfig = {
			...((agent.config as Record<string, unknown>) || {}),
			...(overrides.config || {}),
		}
		const effectiveToolIds = overrides.toolIds ?? (await getAgentToolIds({ agentId: agent.id, db }))

		const errors: ValidationIssue[] = []
		const warnings: ValidationIssue[] = []

		// Validate name
		if (!effectiveName || effectiveName.length < AGENT_VALIDATION.name.min) {
			errors.push({
				field: 'name',
				type: 'error',
				message: `Name must be at least ${AGENT_VALIDATION.name.min} character`,
			})
		} else if (effectiveName.length > AGENT_VALIDATION.name.max) {
			errors.push({
				field: 'name',
				type: 'error',
				message: `Name must be at most ${AGENT_VALIDATION.name.max} characters`,
			})
		}

		// Validate description
		if (effectiveDescription && effectiveDescription.length > AGENT_VALIDATION.description.max) {
			warnings.push({
				field: 'description',
				type: 'warning',
				message: `Description exceeds recommended length of ${AGENT_VALIDATION.description.max} characters`,
			})
		}

		// Validate model
		let modelInfo = null
		if (effectiveModel) {
			if (!ALLOWED_MODEL_IDS.includes(effectiveModel as AllowedModelId)) {
				errors.push({
					field: 'model',
					type: 'error',
					message: `Invalid model: "${effectiveModel}". Must be one of: ${ALLOWED_MODEL_IDS.join(', ')}`,
				})
			} else {
				modelInfo = getModelById(effectiveModel)
				if (modelInfo && !modelInfo.supportsTools && effectiveToolIds.length > 0) {
					warnings.push({
						field: 'model',
						type: 'warning',
						message: `Model ${modelInfo.name} does not support tool calling. Tools will be ignored.`,
					})
				}
			}
		} else {
			errors.push({
				field: 'model',
				type: 'error',
				message: 'Model is required',
			})
		}

		// Validate instructions
		let instructionsLength = 0
		let estimatedTokens = 0
		if (effectiveInstructions) {
			instructionsLength = effectiveInstructions.length

			if (instructionsLength === 0) {
				errors.push({
					field: 'instructions',
					type: 'error',
					message: 'Instructions are required for deployment',
				})
			} else if (instructionsLength > AGENT_VALIDATION.instructions.max) {
				errors.push({
					field: 'instructions',
					type: 'error',
					message: `Instructions exceed maximum length of ${AGENT_VALIDATION.instructions.max} characters`,
				})
			}

			estimatedTokens = Math.ceil(instructionsLength / 4)

			if (modelInfo && estimatedTokens > modelInfo.contextWindow * 0.5) {
				warnings.push({
					field: 'instructions',
					type: 'warning',
					message: `Instructions may use more than 50% of the model's context window (${modelInfo.contextWindow} tokens)`,
				})
			}

			const instructionValidation = validateAgentInstructions(effectiveInstructions)
			if (!instructionValidation.valid) {
				for (const issue of instructionValidation.issues) {
					warnings.push({
						field: 'instructions',
						type: 'warning',
						message: issue,
					})
				}
			}
		} else {
			errors.push({
				field: 'instructions',
				type: 'error',
				message: 'Instructions are required',
			})
		}

		// Validate config parameters
		const temperature =
			typeof effectiveConfig.temperature === 'number' ? effectiveConfig.temperature : undefined
		const maxTokens =
			typeof effectiveConfig.maxTokens === 'number' ? effectiveConfig.maxTokens : undefined
		const topP = typeof effectiveConfig.topP === 'number' ? effectiveConfig.topP : undefined
		const topK = typeof effectiveConfig.topK === 'number' ? effectiveConfig.topK : undefined

		if (temperature !== undefined) {
			if (
				temperature < AGENT_VALIDATION.config.temperature.min ||
				temperature > AGENT_VALIDATION.config.temperature.max
			) {
				errors.push({
					field: 'config.temperature',
					type: 'error',
					message: `Temperature must be between ${AGENT_VALIDATION.config.temperature.min} and ${AGENT_VALIDATION.config.temperature.max}`,
				})
			}
			if (temperature > 1.5) {
				warnings.push({
					field: 'config.temperature',
					type: 'warning',
					message: 'High temperature (>1.5) may produce inconsistent results',
				})
			}
		}

		if (maxTokens !== undefined) {
			if (!Number.isInteger(maxTokens) || maxTokens < AGENT_VALIDATION.config.maxTokens.min) {
				errors.push({
					field: 'config.maxTokens',
					type: 'error',
					message: `Max tokens must be a positive integer (min ${AGENT_VALIDATION.config.maxTokens.min})`,
				})
			} else if (maxTokens > AGENT_VALIDATION.config.maxTokens.max) {
				errors.push({
					field: 'config.maxTokens',
					type: 'error',
					message: `Max tokens must be at most ${AGENT_VALIDATION.config.maxTokens.max}`,
				})
			} else if (modelInfo && maxTokens > modelInfo.maxOutputTokens) {
				errors.push({
					field: 'config.maxTokens',
					type: 'error',
					message: `Max tokens (${maxTokens}) exceeds model limit (${modelInfo.maxOutputTokens})`,
				})
			}
		}

		// Validate tools
		let toolsValid = true

		if (effectiveToolIds.length > AGENT_VALIDATION.maxToolsPerAgent) {
			errors.push({
				field: 'toolIds',
				type: 'error',
				message: `Too many tools. Maximum is ${AGENT_VALIDATION.maxToolsPerAgent}`,
			})
			toolsValid = false
		}

		const customToolIds = effectiveToolIds.filter((id) => !isSystemToolId(id))
		if (customToolIds.length > 0) {
			const existingTools = await db
				.select({ id: toolsTable.id })
				.from(toolsTable)
				.where(eq(toolsTable.workspaceId, workspace.id))

			const existingToolIds = new Set(existingTools.map((t) => t.id))
			const missingTools = customToolIds.filter((id) => !existingToolIds.has(id))

			if (missingTools.length > 0) {
				errors.push({
					field: 'toolIds',
					type: 'error',
					message: `Unknown tools: ${missingTools.join(', ')}`,
				})
				toolsValid = false
			}
		}

		// Build response
		const isValid = errors.length === 0

		let preview: ConfigPreview | undefined
		if (effectiveName && modelInfo) {
			const resolvedConfig = {
				temperature: temperature ?? 0.7,
				maxTokens: maxTokens ?? 4096,
				...(topP !== undefined && { topP }),
				...(topK !== undefined && { topK }),
			}

			const avgCostPer1M = (modelInfo.inputCostPer1M + modelInfo.outputCostPer1M) / 2
			const estimatedCostPer1KTokens = avgCostPer1M / 1000

			preview = {
				name: effectiveName,
				description: effectiveDescription ?? null,
				model: {
					id: modelInfo.id,
					name: modelInfo.name,
					provider: modelInfo.provider,
					contextWindow: modelInfo.contextWindow,
					maxOutputTokens: modelInfo.maxOutputTokens,
					supportsTools: modelInfo.supportsTools,
					estimatedCostPer1KTokens,
				},
				config: resolvedConfig,
				toolCount: effectiveToolIds.length,
				toolsValid,
				instructionsLength,
				estimatedTokens,
				readyForDeployment: isValid && instructionsLength > 0,
			}
		}

		return c.json(
			{
				valid: isValid,
				errors,
				warnings,
				preview,
			},
			200,
		)
	})
