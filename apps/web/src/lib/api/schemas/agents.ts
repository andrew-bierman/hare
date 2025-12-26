import { z } from '@hono/zod-openapi'

/**
 * Agent configuration schema for model parameters.
 */
export const AgentConfigSchema = z
	.object({
		temperature: z.number().min(0).max(2).optional().openapi({ example: 0.7 }),
		maxTokens: z.number().min(1).max(100000).optional().openapi({ example: 4096 }),
		topP: z.number().min(0).max(1).optional().openapi({ example: 0.9 }),
		topK: z.number().min(0).optional().openapi({ example: 40 }),
		stopSequences: z
			.array(z.string())
			.optional()
			.openapi({ example: ['END'] }),
	})
	.openapi('AgentConfig')

/**
 * Agent status enum.
 */
export const AgentStatusSchema = z
	.enum(['draft', 'deployed', 'archived'])
	.openapi({ example: 'draft' })

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
		instructions: z.string().openapi({ example: 'You are a helpful customer support agent.' }),
		config: AgentConfigSchema.optional(),
		status: AgentStatusSchema,
		toolIds: z
			.array(z.string())
			.optional()
			.openapi({ example: ['tool_http', 'tool_sql'] }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		updatedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('Agent')

/**
 * Schema for creating a new agent.
 */
export const CreateAgentSchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'My Agent' }),
		description: z.string().optional().openapi({ example: 'A helpful assistant' }),
		model: z.string().openapi({ example: 'llama-3.3-70b-instruct' }),
		instructions: z.string().min(1).openapi({ example: 'You are a helpful assistant.' }),
		config: AgentConfigSchema.optional(),
		toolIds: z
			.array(z.string())
			.optional()
			.openapi({ example: ['tool_http'] }),
	})
	.openapi('CreateAgent')

/**
 * Schema for updating an agent.
 */
export const UpdateAgentSchema = CreateAgentSchema.partial()
	.extend({
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
 * Deployment response schema.
 */
export const DeploymentSchema = z
	.object({
		id: z.string().openapi({ example: 'deploy_abc123' }),
		status: z.enum(['deployed', 'active', 'pending', 'failed', 'inactive', 'rolled_back']).openapi({
			example: 'deployed',
		}),
		deployedAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
		version: z.string().openapi({ example: '1.0.0' }),
		url: z.string().url().optional().openapi({
			example: 'https://hare.example.com/api/agents/agent_abc123/do',
			description: 'HTTP endpoint URL for the deployed agent',
		}),
		wsUrl: z.string().optional().openapi({
			example: 'wss://hare.example.com/api/agents/agent_abc123/ws',
			description: 'WebSocket endpoint URL for real-time communication',
		}),
	})
	.openapi('Deployment')
