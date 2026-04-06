/**
 * Agent Control Output Schemas
 *
 * Zod schemas for agent control tool outputs.
 */

import { z } from 'zod'

export const AgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	model: z.string(),
	status: z.string(),
	workspaceId: z.string(),
	hasInstructions: z.boolean(),
	config: z.unknown(),
	createdAt: z.number(),
	updatedAt: z.number(),
})

export const ListAgentsOutputSchema = z.object({
	agents: z.array(AgentSchema),
	total: z.number(),
	workspaceId: z.string(),
})

export const ToolInfoSchema = z.object({
	id: z.unknown(),
	name: z.unknown(),
	description: z.unknown(),
	type: z.unknown(),
})

export const MessageWithMetaSchema = z.object({
	id: z.unknown(),
	role: z.unknown(),
	content: z.unknown(),
	createdAt: z.unknown(),
})

export const ScheduledTaskSchema = z.object({
	id: z.unknown(),
	type: z.unknown(),
	action: z.unknown(),
	executeAt: z.unknown(),
	cron: z.unknown(),
	status: z.unknown(),
})

export const GetAgentOutputSchema = z.object({
	id: z.unknown(),
	name: z.unknown(),
	description: z.unknown(),
	model: z.unknown(),
	status: z.unknown(),
	instructions: z.unknown(),
	config: z.unknown(),
	workspaceId: z.string(),
	createdBy: z.unknown(),
	createdAt: z.unknown(),
	updatedAt: z.unknown(),
	tools: z.array(ToolInfoSchema).optional(),
	messages: z.array(MessageWithMetaSchema).optional(),
	messageCount: z.number().optional(),
	scheduledTasks: z.array(ScheduledTaskSchema),
})

export const SendMessageOutputSchema = z.object({
	agentId: z.string(),
	messageId: z.string(),
	userMessage: z.string(),
	assistantResponse: z.string(),
	timestamp: z.number(),
	completed: z.boolean(),
	note: z.string().optional(),
})

export const ConfigureAgentOutputSchema = z.object({
	agentId: z.string(),
	workspaceId: z.string(),
	changes: z.object({
		name: z.string().optional(),
		instructions: z.string().optional(),
		model: z.string().optional(),
	}),
	updatedAt: z.number(),
})

export const CreateAgentOutputSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	instructions: z.string().nullable(),
	model: z.string(),
	config: z
		.object({
			temperature: z.number().optional(),
			maxTokens: z.number().optional(),
		})
		.nullable(),
	workspaceId: z.string(),
	status: z.string(),
	createdAt: z.number(),
	createdBy: z.string(),
})

export const DeleteAgentOutputSchema = z.object({
	agentId: z.string(),
	name: z.unknown(),
	deleted: z.boolean(),
	deletedAt: z.number(),
})

export const ScheduleTaskOutputSchema = z.object({
	id: z.string(),
	agentId: z.string(),
	action: z.string(),
	type: z.string(),
	executeAt: z.number().optional(),
	cron: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
	status: z.string(),
	createdAt: z.number(),
})

export const ExecuteToolOutputSchema = z.object({
	agentId: z.string(),
	toolId: z.string(),
	result: z.union([
		z.object({
			success: z.boolean(),
			data: z.record(z.string(), z.unknown()),
		}),
		z.object({
			success: z.literal(false),
			error: z.string(),
		}),
		z.unknown(),
	]),
	executedAt: z.number(),
})

export const CustomToolSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	type: z.string(),
	inputSchema: z.unknown(),
})

export const SystemToolSchema = z.object({
	id: z.string(),
	type: z.string(),
	description: z.string(),
})

export const ListAgentToolsOutputSchema = z.object({
	agentId: z.string(),
	customTools: z.array(CustomToolSchema),
	systemTools: z.array(SystemToolSchema),
	total: z.number(),
})

export const TokensUsedSchema = z.object({
	input: z.number(),
	output: z.number(),
	total: z.number(),
})

export const ScheduleExecutionsSchema = z.object({
	total: z.number(),
	completed: z.number(),
	failed: z.number(),
})

export const GetAgentMetricsOutputSchema = z.object({
	agentId: z.string(),
	agentName: z.unknown(),
	period: z.string(),
	timeRange: z.object({
		start: z.number(),
		end: z.number(),
	}),
	metrics: z.object({
		totalApiCalls: z.number(),
		totalMessages: z.number(),
		totalConversations: z.number(),
		averageResponseTime: z.number(),
		tokensUsed: TokensUsedSchema,
		estimatedCost: z.number(),
		scheduleExecutions: ScheduleExecutionsSchema,
	}),
	generatedAt: z.number(),
})

export const DeployAgentOutputSchema = z.object({
	agentId: z.string(),
	status: z.string(),
	previousStatus: z.string(),
	deployedAt: z.number(),
})

export const UndeployAgentOutputSchema = z.object({
	agentId: z.string(),
	status: z.string(),
	previousStatus: z.string(),
	undeployedAt: z.number(),
})

export const RollbackAgentOutputSchema = z.object({
	agentId: z.string(),
	rolledBackTo: z.string(),
	previousConfig: z.unknown(),
	restoredConfig: z.unknown(),
	rolledBackAt: z.number(),
})

export const WebhookSchema = z.object({
	id: z.string(),
	url: z.string(),
	events: z.array(z.string()),
	status: z.string(),
	createdAt: z.unknown(),
})

export const ListWebhooksOutputSchema = z.object({
	agentId: z.string(),
	webhooks: z.array(WebhookSchema),
	total: z.number(),
})

export const CreateWebhookOutputSchema = z.object({
	id: z.string(),
	agentId: z.string(),
	url: z.string(),
	events: z.array(z.string()),
	status: z.string(),
	createdAt: z.number(),
})

export const DeleteWebhookOutputSchema = z.object({
	webhookId: z.string(),
	agentId: z.string(),
	deleted: z.boolean(),
	deletedAt: z.number(),
})
