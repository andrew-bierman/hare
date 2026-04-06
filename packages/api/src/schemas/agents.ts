import {
	AGENT_STATUSES,
	config,
	DEPLOYMENT_STATUSES,
	VALIDATION_ISSUE_SEVERITIES,
} from '@hare/config'
import { z } from 'zod'

// =============================================================================
// Validation Constants
// =============================================================================

/**
 * Agent validation limits - derived from config.agents.limits in @hare/config
 * Additional validation constraints for config parameters are defined here
 */
export const AGENT_VALIDATION = {
	name: {
		min: config.agents.limits.nameMinLength,
		max: config.agents.limits.nameMaxLength,
	},
	description: {
		max: config.agents.limits.descriptionMaxLength,
	},
	instructions: {
		min: 1,
		max: config.agents.limits.instructionsMaxLength,
	},
	config: {
		temperature: {
			min: 0,
			max: 2,
		},
		maxTokens: {
			min: 1,
			max: 128000,
		},
		topP: {
			min: 0,
			max: 1,
		},
		topK: {
			min: 0,
		},
	},
	maxToolsPerAgent: config.agents.limits.maxToolsPerAgent,
} as const

/**
 * Allowed AI model IDs - derived from config.models.list in @hare/config
 */
export const ALLOWED_MODEL_IDS = config.models.list.map((m) => m.id)

export type AllowedModelId = (typeof ALLOWED_MODEL_IDS)[number]

// =============================================================================
// Agent Configuration Schema
// =============================================================================

/**
 * Agent configuration schema for model parameters.
 */
export const AgentConfigSchema = z
	.object({
		temperature: z
			.number()
			.min(AGENT_VALIDATION.config.temperature.min, 'Temperature must be at least 0')
			.max(AGENT_VALIDATION.config.temperature.max, 'Temperature must be at most 2')
			.optional()
			,
		maxTokens: z
			.number()
			.int('Max tokens must be an integer')
			.positive('Max tokens must be positive')
			.min(AGENT_VALIDATION.config.maxTokens.min, 'Max tokens must be at least 1')
			.max(AGENT_VALIDATION.config.maxTokens.max, 'Max tokens must be at most 128000')
			.optional()
			,
		topP: z
			.number()
			.min(AGENT_VALIDATION.config.topP.min, 'Top-P must be at least 0')
			.max(AGENT_VALIDATION.config.topP.max, 'Top-P must be at most 1')
			.optional()
			,
		topK: z
			.number()
			.int('Top-K must be an integer')
			.min(AGENT_VALIDATION.config.topK.min, 'Top-K must be at least 0')
			.optional()
			,
		stopSequences: z
			.array(z.string().max(100, 'Stop sequence must be at most 100 characters'))
			.max(10, 'Maximum 10 stop sequences allowed')
			.optional()
			,
	})
	

/**
 * Agent status enum.
 */
export const AgentStatusSchema = z.enum(AGENT_STATUSES)

/**
 * Full agent schema for API responses.
 */
export const AgentSchema = z
	.object({
		id: z.string(),
		workspaceId: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		model: z.string(),
		instructions: z
			.string()
			.nullable()
			,
		config: AgentConfigSchema.optional(),
		status: AgentStatusSchema,
		systemToolsEnabled: z
			.boolean()
			,
		toolIds: z
			.array(z.string())
			.optional()
			,
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	

/**
 * Model ID schema with validation against allowed models
 */
export const ModelIdSchema = z
	.string()
	.min(1, 'Model is required')
	.refine((id) => ALLOWED_MODEL_IDS.includes(id as AllowedModelId), {
		message: `Invalid model. Must be one of: ${ALLOWED_MODEL_IDS.join(', ')}`,
	})
	

/**
 * Schema for creating a new agent.
 * All fields have strict validation rules.
 */
export const CreateAgentSchema = z
	.object({
		name: z
			.string()
			.min(AGENT_VALIDATION.name.min, 'Name is required')
			.max(
				AGENT_VALIDATION.name.max,
				`Name must be at most ${AGENT_VALIDATION.name.max} characters`,
			)
			.trim()
			,
		description: z
			.string()
			.max(
				AGENT_VALIDATION.description.max,
				`Description must be at most ${AGENT_VALIDATION.description.max} characters`,
			)
			.optional()
			,
		model: ModelIdSchema,
		instructions: z
			.string()
			.min(AGENT_VALIDATION.instructions.min, 'Instructions are required')
			.max(
				AGENT_VALIDATION.instructions.max,
				`Instructions must be at most ${AGENT_VALIDATION.instructions.max} characters`,
			)
			,
		config: AgentConfigSchema.optional(),
		systemToolsEnabled: z.boolean().optional().default(true),
		toolIds: z
			.array(z.string())
			.max(
				AGENT_VALIDATION.maxToolsPerAgent,
				`Maximum ${AGENT_VALIDATION.maxToolsPerAgent} tools allowed`,
			)
			.optional()
			,
	})
	

/**
 * Schema for updating an agent.
 * All fields are optional but follow the same validation rules when provided.
 */
export const UpdateAgentSchema = z
	.object({
		name: z
			.string()
			.min(AGENT_VALIDATION.name.min, 'Name cannot be empty')
			.max(
				AGENT_VALIDATION.name.max,
				`Name must be at most ${AGENT_VALIDATION.name.max} characters`,
			)
			.trim()
			.optional(),
		description: z
			.string()
			.max(
				AGENT_VALIDATION.description.max,
				`Description must be at most ${AGENT_VALIDATION.description.max} characters`,
			)
			.optional(),
		model: z
			.string()
			.min(1, 'Model cannot be empty')
			.refine((id) => ALLOWED_MODEL_IDS.includes(id as AllowedModelId), {
				message: `Invalid model. Must be one of: ${ALLOWED_MODEL_IDS.join(', ')}`,
			})
			.optional(),
		instructions: z
			.string()
			.min(AGENT_VALIDATION.instructions.min, 'Instructions cannot be empty')
			.max(
				AGENT_VALIDATION.instructions.max,
				`Instructions must be at most ${AGENT_VALIDATION.instructions.max} characters`,
			)
			.optional(),
		config: AgentConfigSchema.optional(),
		systemToolsEnabled: z.boolean().optional(),
		toolIds: z
			.array(z.string())
			.max(
				AGENT_VALIDATION.maxToolsPerAgent,
				`Maximum ${AGENT_VALIDATION.maxToolsPerAgent} tools allowed`,
			)
			.optional(),
		status: AgentStatusSchema.optional(),
	})
	

/**
 * Schema for deploying an agent.
 */
export const DeployAgentSchema = z
	.object({
		version: z.string().optional(),
	})
	

/**
 * Deployment endpoints schema.
 * Note: URLs may be relative paths (e.g., /api/agents/xxx/chat) or absolute URLs
 */
export const DeploymentEndpointsSchema = z
	.object({
		chat: z.string(),
		websocket: z.string(),
		state: z.string(),
	})
	

/**
 * Deployment response schema.
 */
export const DeploymentSchema = z
	.object({
		id: z.string(),
		status: z.enum(DEPLOYMENT_STATUSES),
		deployedAt: z.string().datetime(),
		version: z.string(),
		url: z.string(),
		endpoints: DeploymentEndpointsSchema,
	})
	

// =============================================================================
// Preview/Validation Schemas
// =============================================================================

/**
 * Validation issue schema for errors and warnings
 */
export const ValidationIssueSchema = z
	.object({
		field: z.string().describe('Field that has the issue'),
		type: z.enum(VALIDATION_ISSUE_SEVERITIES).describe('Issue severity'),
		message: z.string().describe('Issue description'),
	})
	

/**
 * Model information for preview
 */
export const ModelPreviewSchema = z
	.object({
		id: z.string().describe('Model ID'),
		name: z.string().describe('Human-readable model name'),
		provider: z.string().describe('Model provider'),
		contextWindow: z.number().describe('Maximum context window size'),
		maxOutputTokens: z.number().describe('Maximum output tokens'),
		supportsTools: z.boolean().describe('Whether model supports tool calling'),
		estimatedCostPer1KTokens: z.number().describe('Estimated cost per 1K tokens'),
	})
	

/**
 * Effective configuration with defaults applied
 */
export const ConfigPreviewSchema = z
	.object({
		temperature: z.number().describe('Effective temperature'),
		maxTokens: z.number().describe('Effective max tokens'),
		topP: z.number().optional().describe('Effective top-p if set'),
		topK: z.number().optional().describe('Effective top-k if set'),
	})
	

/**
 * Full preview of agent configuration
 */
export const AgentPreviewSchema = z
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
	

/**
 * Response schema for agent preview/validation endpoint
 */
export const AgentPreviewResponseSchema = z
	.object({
		valid: z.boolean().describe('Whether the configuration is valid for deployment'),
		errors: z.array(ValidationIssueSchema).describe('Blocking errors that must be fixed'),
		warnings: z.array(ValidationIssueSchema).describe('Non-blocking warnings'),
		preview: AgentPreviewSchema.optional().describe(
			'Preview of the resolved configuration (only if no critical errors)',
		),
	})
	

/**
 * Input schema for preview endpoint - allows overriding agent fields
 */
export const AgentPreviewInputSchema = z
	.object({
		name: z.string().optional().describe('Override agent name'),
		description: z.string().optional().describe('Override agent description'),
		model: z.string().optional().describe('Override model ID'),
		instructions: z.string().optional().describe('Override agent instructions'),
		config: AgentConfigSchema.optional().describe('Override model configuration'),
		toolIds: z.array(z.string()).optional().describe('Override tool IDs'),
	})
	

// =============================================================================
// Agent Version Schemas
// =============================================================================

/**
 * Schema for a single agent version record.
 */
export const AgentVersionSchema = z
	.object({
		id: z.string(),
		agentId: z.string(),
		version: z.number().int(),
		instructions: z.string().nullable(),
		model: z.string(),
		config: AgentConfigSchema.nullable().optional(),
		toolIds: z
			.array(z.string())
			.nullable()
			,
		createdAt: z.string().datetime(),
		createdBy: z.string(),
	})
	

/**
 * Query parameters for listing agent versions.
 */
export const AgentVersionsQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.default(20)
			,
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.optional()
			.default(0)
			,
	})
	

/**
 * Response schema for listing agent versions.
 */
export const AgentVersionsResponseSchema = z
	.object({
		versions: z.array(AgentVersionSchema),
		total: z.number().int(),
		limit: z.number().int(),
		offset: z.number().int(),
	})
	

// =============================================================================
// Agent Rollback Schemas
// =============================================================================

/**
 * Schema for rollback request body.
 */
export const RollbackAgentSchema = z
	.object({
		version: z
			.number()
			.int()
			.positive('Version must be a positive integer')
			,
	})
	

/**
 * Response schema for agent rollback.
 */
export const RollbackResponseSchema = z
	.object({
		success: z.boolean(),
		previousVersion: z
			.number()
			.int()
			,
		restoredVersion: z
			.number()
			.int()
			,
		newVersion: z.number().int(),
		deployment: DeploymentSchema.optional(),
	})
	

// =============================================================================
// Agent Clone Schemas
// =============================================================================

/**
 * Response schema for agent clone.
 */
export const CloneAgentResponseSchema = z
	.object({
		id: z
			.string()
			,
		redirectUrl: z.string(),
	})
	
