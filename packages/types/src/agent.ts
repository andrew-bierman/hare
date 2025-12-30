/**
 * Agent Types
 *
 * Type definitions for Hare Agents that can be safely imported
 * in any environment (Vite, Workers, etc.)
 *
 * All types are derived from Zod schemas for runtime validation.
 */

import type { ModelMessage } from 'ai'
import { z } from 'zod'

// =============================================================================
// Scheduled Task
// =============================================================================

export const ScheduledTaskSchema = z.object({
	id: z.string(),
	type: z.enum(['one-time', 'recurring']),
	executeAt: z.number().optional(),
	cron: z.string().optional(),
	action: z.string(),
	payload: z.record(z.string(), z.unknown()).optional(),
})

export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>

// =============================================================================
// Agent State
// =============================================================================

export const HareAgentStateSchema = z.object({
	/** Agent configuration ID */
	agentId: z.string(),
	/** Workspace ID */
	workspaceId: z.string(),
	/** Agent name */
	name: z.string(),
	/** Agent instructions/system prompt */
	instructions: z.string(),
	/** Model to use */
	model: z.string(),
	/** Conversation history - AI SDK ModelMessage array */
	messages: z.custom<ModelMessage[]>((val) => Array.isArray(val)),
	/** Whether the agent is currently processing */
	isProcessing: z.boolean(),
	/** Last activity timestamp */
	lastActivity: z.number(),
	/** Connected user IDs */
	connectedUsers: z.array(z.string()),
	/** Scheduled tasks */
	scheduledTasks: z.array(ScheduledTaskSchema),
	/** Agent status */
	status: z.enum(['idle', 'processing', 'error']),
	/** Last error if any */
	lastError: z.string().optional(),
})

export type HareAgentState = z.infer<typeof HareAgentStateSchema>

// =============================================================================
// Client Messages (Client -> Agent)
// =============================================================================

export const ChatPayloadSchema = z.object({
	message: z.string(),
	userId: z.string(),
	sessionId: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ChatPayload = z.infer<typeof ChatPayloadSchema>

export const ToolExecutePayloadSchema = z.object({
	toolId: z.string(),
	params: z.record(z.string(), z.unknown()),
})

export type ToolExecutePayload = z.infer<typeof ToolExecutePayloadSchema>

export const SchedulePayloadSchema = z.object({
	action: z.string(),
	executeAt: z.number().optional(),
	cron: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).optional(),
})

export type SchedulePayload = z.infer<typeof SchedulePayloadSchema>

export const ConfigurePayloadSchema = z.object({
	name: z.string().optional(),
	instructions: z.string().optional(),
	model: z.string().optional(),
})

export type ConfigurePayload = z.infer<typeof ConfigurePayloadSchema>

// Client message - simple schema matching existing usage
export const ClientMessageSchema = z.object({
	type: z.enum(['chat', 'configure', 'execute_tool', 'get_state', 'schedule']),
	payload: z.unknown(),
})

export type ClientMessage = z.infer<typeof ClientMessageSchema>

// =============================================================================
// Server Messages (Agent -> Client)
// =============================================================================

// Server message - simple schema matching existing usage
export const ServerMessageSchema = z.object({
	type: z.enum(['text', 'tool_call', 'tool_result', 'state_update', 'error', 'done']),
	data: z.unknown(),
	timestamp: z.number(),
})

export type ServerMessage = z.infer<typeof ServerMessageSchema>

// =============================================================================
// MCP Agent State
// =============================================================================

export const McpAgentStateSchema = z.object({
	workspaceId: z.string(),
	connectedClients: z.number(),
	lastActivity: z.number(),
})

export type McpAgentState = z.infer<typeof McpAgentStateSchema>

// =============================================================================
// Default States
// =============================================================================

/**
 * Default initial state for HareAgent.
 */
export const DEFAULT_HARE_AGENT_STATE: HareAgentState = {
	agentId: '',
	workspaceId: '',
	name: 'Hare Agent',
	instructions: 'You are a helpful AI assistant.',
	model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	messages: [],
	isProcessing: false,
	lastActivity: Date.now(),
	connectedUsers: [],
	scheduledTasks: [],
	status: 'idle',
}

/**
 * Default initial state for MCP Agent.
 */
export const DEFAULT_MCP_AGENT_STATE: McpAgentState = {
	workspaceId: '',
	connectedClients: 0,
	lastActivity: Date.now(),
}
