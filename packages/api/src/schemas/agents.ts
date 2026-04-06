import {
	AGENT_STATUSES,
	config,
	DEPLOYMENT_STATUSES,
	VALIDATION_ISSUE_SEVERITIES,
} from '@hare/config'
import { z } from '@hono/zod-openapi'

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
			.openapi({
				example: 0.7,
				description: 'Model temperature (0-2). Higher values = more creative.',
			}),
		maxTokens: z
			.number()
			.int('Max tokens must be an integer')
			.positive('Max tokens must be positive')
			.min(AGENT_VALIDATION.config.maxTokens.min, 'Max tokens must be at least 1')
			.max(AGENT_VALIDATION.config.maxTokens.max, 'Max tokens must be at most 128000')
			.optional()
			.openapi({ example: 4096, description: 'Maximum output tokens (1-128000).' }),
		topP: z
			.number()
			.min(AGENT_VALIDATION.config.topP.min, 'Top-P must be at least 0')
			.max(AGENT_VALIDATION.config.topP.max, 'Top-P must be at most 1')
			.optional()
			.openapi({ example: 0.9, description: 'Nucleus sampling threshold (0-1).' }),
		topK: z
			.number()
			.int('Top-K must be an integer')
			.min(AGENT_VALIDATION.config.topK.min, 'Top-K must be at least 0')
			.optional()
			.openapi({ example: 40, description: 'Top-K sampling (0+).' }),
		stopSequences: z
			.array(z.string().max(100, 'Stop sequence must be at most 100 characters'))
			.max(10, 'Maximum 10 stop sequences allowed')
			.optional()
			.openapi({ example: ['END'], description: 'Sequences that stop generation.' }),
	})
	.openapi('AgentConfig')

/**
 * Agent status enum.
 */
export const AgentStatusSchema = z.enum(AGENT_STATUSES).openapi({ example: 'draft' })

/**
 * Full agent schema for API responses.
 */
export const AgentSchema = z
	.object({
		id: z.string().openapi({ example: 'agent_abc123' }),
		workspaceId: z.string().openapi({ example: 'ws_xyz789' }),
		name: z.string().openapi({ example: 'Customer Support Agent' }),
		description: z.string().nullable().openapi({ example: 'Handles customer inquiries' }),
		model: z.string().openapi({ example: 'llama-3.3-70b-instruct' }),
		instructions: z
			.string()
			.nullable()
			.openapi({ example: 'You are a helpful customer support agent.' }),
		config: AgentConfigSchema.optional(),
		status: AgentStatusSchema,
		systemToolsEnabled: z
			.boolean()
			.openapi({ example: true, description: 'Whether system tools are enabled for this agent' }),
		conversationStarters: z
			.array(z.string())
			.nullable()
			.optional()
			.openapi({
				example: ['How can I help you today?', 'What would you like to know?'],
				description: 'Suggested first messages shown in the chat widget',
			}),
		guardrailsEnabled: z
			.boolean()
			.openapi({ example: false, description: 'Whether guardrails are enabled for this agent' }),
		toolIds: z
			.array(z.string())
			.optional()
			.openapi({ example: ['tool_http', 'tool_sql'] }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Agent')

/**
 * Model ID schema with validation against allowed models
 */
export const ModelIdSchema = z
	.string()
	.min(1, 'Model is required')
	.refine((id) => ALLOWED_MODEL_IDS.includes(id as AllowedModelId), {
		message: `Invalid model. Must be one of: ${ALLOWED_MODEL_IDS.join(', ')}`,
	})
	.openapi({ example: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' })

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
			.openapi({ example: 'My Agent', description: 'Agent display name (1-100 chars)' }),
		description: z
			.string()
			.max(
				AGENT_VALIDATION.description.max,
				`Description must be at most ${AGENT_VALIDATION.description.max} characters`,
			)
			.optional()
			.openapi({
				example: 'A helpful assistant',
				description: 'Agent description (max 500 chars)',
			}),
		model: ModelIdSchema,
		instructions: z
			.string()
			.min(AGENT_VALIDATION.instructions.min, 'Instructions are required')
			.max(
				AGENT_VALIDATION.instructions.max,
				`Instructions must be at most ${AGENT_VALIDATION.instructions.max} characters`,
			)
			.openapi({
				example: 'You are a helpful assistant.',
				description: 'System prompt/instructions (1-10000 chars)',
			}),
		config: AgentConfigSchema.optional(),
		systemToolsEnabled: z.boolean().optional().default(true).openapi({
			example: true,
			description: 'Enable built-in system tools (storage, HTTP, AI, etc.). Defaults to true.',
		}),
		conversationStarters: z
			.array(z.string().max(200, 'Each starter must be at most 200 characters'))
			.max(6, 'Maximum 6 conversation starters')
			.optional()
			.openapi({
				example: ['How can I help you?', 'Tell me about your products'],
				description: 'Suggested first messages for the chat widget (max 6)',
			}),
		guardrailsEnabled: z.boolean().optional().default(false).openapi({
			example: false,
			description: 'Enable guardrails for input/output safety',
		}),
		toolIds: z
			.array(z.string())
			.max(
				AGENT_VALIDATION.maxToolsPerAgent,
				`Maximum ${AGENT_VALIDATION.maxToolsPerAgent} tools allowed`,
			)
			.optional()
			.openapi({ example: ['tool_http'], description: 'Tool IDs to attach (max 20)' }),
	})
	.openapi('CreateAgent')

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
		conversationStarters: z
			.array(z.string().max(200))
			.max(6, 'Maximum 6 conversation starters')
			.optional(),
		guardrailsEnabled: z.boolean().optional(),
		toolIds: z
			.array(z.string())
			.max(
				AGENT_VALIDATION.maxToolsPerAgent,
				`Maximum ${AGENT_VALIDATION.maxToolsPerAgent} tools allowed`,
			)
			.optional(),
		status: AgentStatusSchema.optional(),
	})
	.openapi('UpdateAgent')

/**
 * Schema for deploying an agent.
 */
export const DeployAgentSchema = z
	.object({
		version: z.string().optional().openapi({ example: '1.0.0' }),
	})
	.openapi('DeployAgent')

/**
 * Deployment endpoints schema.
 * Note: URLs may be relative paths (e.g., /api/agents/xxx/chat) or absolute URLs
 */
export const DeploymentEndpointsSchema = z
	.object({
		chat: z.string().openapi({
			example: '/api/agents/agent_abc123/chat',
			description: 'HTTP endpoint for sending chat messages',
		}),
		websocket: z.string().openapi({
			example: '/api/agents/agent_abc123/ws',
			description: 'WebSocket endpoint for real-time chat',
		}),
		state: z.string().openapi({
			example: '/api/agents/agent_abc123/state',
			description: 'Endpoint to retrieve agent state',
		}),
	})
	.openapi('DeploymentEndpoints')

/**
 * Deployment response schema.
 */
export const DeploymentSchema = z
	.object({
		id: z.string().openapi({ example: 'deploy_abc123' }),
		status: z.enum(DEPLOYMENT_STATUSES).openapi({ example: 'deployed' }),
		deployedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		version: z.string().openapi({ example: '1.0.0' }),
		url: z.string().openapi({
			example: '/api/agents/agent_abc123',
			description: 'Base URL for the deployed agent',
		}),
		endpoints: DeploymentEndpointsSchema,
	})
	.openapi('Deployment')

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
	.openapi('ValidationIssue')

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
	.openapi('ModelPreview')

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
	.openapi('ConfigPreview')

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
	.openapi('AgentPreview')

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
	.openapi('AgentPreviewResponse')

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
	.openapi('AgentPreviewInput')

// =============================================================================
// Agent Version Schemas
// =============================================================================

/**
 * Schema for a single agent version record.
 */
export const AgentVersionSchema = z
	.object({
		id: z.string().openapi({ example: 'ver_abc123' }),
		agentId: z.string().openapi({ example: 'agent_xyz789' }),
		version: z.number().int().openapi({ example: 1, description: 'Version number' }),
		instructions: z.string().nullable().openapi({ example: 'You are a helpful assistant.' }),
		model: z.string().openapi({ example: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' }),
		config: AgentConfigSchema.nullable().optional(),
		toolIds: z
			.array(z.string())
			.nullable()
			.openapi({ example: ['tool_http'] }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		createdBy: z.string().openapi({ example: 'user_abc123' }),
	})
	.openapi('AgentVersion')

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
			.openapi({ example: 20, description: 'Maximum number of versions to return (1-100)' }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.optional()
			.default(0)
			.openapi({ example: 0, description: 'Number of versions to skip' }),
	})
	.openapi('AgentVersionsQuery')

/**
 * Response schema for listing agent versions.
 */
export const AgentVersionsResponseSchema = z
	.object({
		versions: z.array(AgentVersionSchema).openapi({ description: 'List of agent versions' }),
		total: z.number().int().openapi({ example: 5, description: 'Total number of versions' }),
		limit: z.number().int().openapi({ example: 20, description: 'Limit used in query' }),
		offset: z.number().int().openapi({ example: 0, description: 'Offset used in query' }),
	})
	.openapi('AgentVersionsResponse')

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
			.openapi({ example: 1, description: 'Version number to rollback to' }),
	})
	.openapi('RollbackAgent')

/**
 * Response schema for agent rollback.
 */
export const RollbackResponseSchema = z
	.object({
		success: z.boolean().openapi({ example: true }),
		previousVersion: z
			.number()
			.int()
			.openapi({ example: 3, description: 'Version before rollback' }),
		restoredVersion: z
			.number()
			.int()
			.openapi({ example: 1, description: 'Version that was restored' }),
		newVersion: z.number().int().openapi({ example: 4, description: 'New version number created' }),
		deployment: DeploymentSchema.optional().openapi({
			description: 'Deployment info if agent was redeployed',
		}),
	})
	.openapi('RollbackResponse')

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
			.openapi({ example: 'agent_xyz789', description: 'ID of the newly cloned agent' }),
		redirectUrl: z.string().openapi({
			example: '/dashboard/agents/agent_xyz789',
			description: 'URL to redirect to the new agent',
		}),
	})
	.openapi('CloneAgentResponse')
